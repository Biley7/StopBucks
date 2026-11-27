// @vitest-environment jsdom

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnimatedProgressBar,
  RollingNumber,
  SharedPillTabs,
} from "@/components/shared/motion-primitives";
import { BrandMark } from "@/components/shared/brand-mark";
import { TransactionLedger } from "@/components/quick-log/transaction-ledger";
import { BiasCards } from "@/components/bias-radar/bias-cards";
import { DisplayPreferenceProvider } from "@/lib/display-preference-context";
import { splitFormattedDisplayParts } from "@/lib/format-parts";
import { analyzeBiases } from "@/domain/behavioral-engine";
import type { Transaction, UserProfile } from "@/domain/types";

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) =>
    React.createElement("img", { ...props, alt: props.alt ?? "" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/repositories/repository-provider", () => ({
  useRepository: () => ({
    repository: {
      deleteTransaction: vi.fn(),
      updateTransaction: vi.fn(),
    },
    cacheIdentity: { mode: "guest", userId: "guest-sandbox-user" } as const,
    activeMode: "guest" as const,
    isGuest: true,
    isLoading: false,
    user: null,
    isSupabaseAvailable: false,
    enterGuestMode: vi.fn(),
    exitGuestMode: vi.fn(),
    resetDemo: vi.fn(),
  }),
}));

const PROFILE: UserProfile = {
  userId: "user-1",
  currency: "INR",
  monthlyBudgetMinor: 2000000,
  selfInvestTargetMinor: 350000,
  hourlyRateMinor: 20000,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    userId: "user-1",
    amountMinor: 24000,
    note: "Late night ramen",
    triggerTag: "stress_late_night",
    paymentMode: "cashless",
    loggedAt: "2026-11-26T23:15:00.000Z",
    createdAt: "2026-11-26T23:15:00.000Z",
  },
  {
    id: "tx-2",
    userId: "user-1",
    amountMinor: 50000,
    note: "Behavioral econ book",
    triggerTag: "invest_self",
    paymentMode: "cashless",
    loggedAt: "2026-11-25T14:00:00.000Z",
    createdAt: "2026-11-25T14:00:00.000Z",
  },
];

afterEach(() => {
  cleanup();
});

describe("Phase 8: Display part tokenizer & RollingNumber", () => {
  it("tokenizes currency, negative values, work hours, and 4-yr compounded strings losslessly", () => {
    const samples = [
      "₹1,240.00",
      "-₹420.50",
      "HK$1,234.50",
      "$98.75",
      "6.2 hrs of work",
      "1.0 hr of work",
      "₹1,679.52 in 4 yrs",
      "120 XP",
    ];
    for (const sample of samples) {
      const parts = splitFormattedDisplayParts(sample);
      expect(`${parts.prefix}${parts.integer}${parts.decimal}${parts.suffix}`).toBe(
        sample
      );
    }
  });

  it("renders accessible complete value and updates cleanly when value changes", () => {
    const { rerender } = render(<RollingNumber value="₹1,240.00" hierarchy="prominent" />);
    expect(screen.getByText("₹1,240.00")).toBeTruthy();

    rerender(<RollingNumber value="₹1,190.00" hierarchy="prominent" />);
    expect(screen.getByText("₹1,190.00")).toBeTruthy();

    rerender(<RollingNumber value="6.0 hrs of work" hierarchy="prominent" />);
    expect(screen.getByText("6.0 hrs of work")).toBeTruthy();
  });
});

describe("Phase 8: SharedPillTabs & GPU AnimatedProgressBar", () => {
  it("supports selection, disabled states, and arrow keyboard navigation", () => {
    const onChange = vi.fn();
    render(
      <SharedPillTabs
        items={[
          { value: "currency", label: "Currency" },
          { value: "work_hours", label: "Work Hours" },
          { value: "compounded_4yr", label: "4-Yr Cost", disabled: true },
        ]}
        value="currency"
        onChange={onChange}
        ariaLabel="Display mode"
      />
    );

    const currencyBtn = screen.getByRole("button", { name: "Currency" });
    const hoursBtn = screen.getByRole("button", { name: "Work Hours" });
    const costBtn = screen.getByRole("button", { name: "4-Yr Cost" });

    expect(currencyBtn.getAttribute("aria-pressed")).toBe("true");
    expect((costBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(hoursBtn);
    expect(onChange).toHaveBeenCalledWith("work_hours");

    fireEvent.keyDown(currencyBtn, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("work_hours");
  });

  it("uses scaleX transform with left transformOrigin and clamps out-of-range values visually", () => {
    const { container } = render(
      <AnimatedProgressBar value={140} ariaLabel="Budget used" />
    );
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("100");
    const fill = bar?.firstElementChild as HTMLElement | null;
    expect(fill?.style.transformOrigin).toBe("left");
    expect(fill?.style.width).toBe("");
  });
});

describe("Phase 8: Unboxed BrandMark", () => {
  it("renders tightly cropped emblem directly without enclosing box and avoids duplicate alt text", () => {
    const { container } = render(
      <BrandMark size="md" showWordmark subtitle="Behavioral Finance" />
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/stopbucks-emblem.png");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("StopBucks")).toBeTruthy();
  });
});

describe("Phase 8: Inline Row & Bias Card Expansion", () => {
  it("expands a transaction row inline to show multi-unit details without breaking edit/delete", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DisplayPreferenceProvider>
          <TransactionLedger
            profile={PROFILE}
            transactions={SAMPLE_TRANSACTIONS}
            isLoading={false}
            confirmedTransactionId="tx-1"
          />
        </DisplayPreferenceProvider>
      </QueryClientProvider>
    );

    // Optimistic/confirmed badge appears on confirmed row
    expect(screen.getAllByText("Logged").length).toBeGreaterThanOrEqual(1);

    // Click desktop expand button for Late night ramen
    const expandBtns = screen.getAllByRole("button", { name: /Late night ramen/i });
    fireEvent.click(expandBtns[0]);

    expect(expandBtns[0].getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText("Currency Amount").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("4-Year Compounded Cost").length).toBeGreaterThanOrEqual(1);

    // Clicking Edit does not collapse expansion and opens Edit dialog
    const editButtons = screen.getAllByRole("button", { name: /Edit Late night ramen/i });
    fireEvent.click(editButtons[0]);
    expect(screen.getByText("Edit Transaction")).toBeTruthy();
    expect(expandBtns[0].getAttribute("aria-expanded")).toBe("true");
  });

  it("expands and collapses bias detector cards inline", async () => {
    const bias = analyzeBiases(PROFILE, SAMPLE_TRANSACTIONS, "UTC");
    render(
      <DisplayPreferenceProvider>
        <BiasCards bias={bias} profile={PROFILE} />
      </DisplayPreferenceProvider>
    );

    const detailsButtons = screen.getAllByRole("button", { name: /Details/i });
    expect(detailsButtons).toHaveLength(4);
    fireEvent.click(detailsButtons[0]);

    expect(detailsButtons[0].getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Currency")).toBeTruthy();
    expect(screen.getByText("Work Hours")).toBeTruthy();
    expect(screen.getByText("4-Yr Cost")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Less/i }));
    await waitFor(() => {
      expect(screen.queryByText("4-Yr Cost")).toBeNull();
    });
  });
});

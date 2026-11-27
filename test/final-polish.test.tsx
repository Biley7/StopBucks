// @vitest-environment jsdom

import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseReducedMotion = vi.fn<() => boolean | null>(() => false);
const mockUsePathname = vi.fn(() => "/runway");

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

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

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useQueryClient: () => ({ clear: vi.fn(), invalidateQueries: vi.fn() }),
  };
});

vi.mock("@/repositories/repository-provider", () => ({
  useRepository: () => ({
    repository: {},
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

import LandingPage from "@/app/page";
import AppLayout from "@/app/(app)/layout";
import { LandingAmbientMotion } from "@/components/shared/landing-ambient-motion";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { DojoSideRail } from "@/components/dojo/dojo-side-rail";
import { DisplayPreferenceProvider } from "@/lib/display-preference-context";
import { createInitialDojoProgress } from "@/domain/dojo-engine";

afterEach(() => {
  cleanup();
  mockUseReducedMotion.mockReturnValue(false);
  mockUsePathname.mockReturnValue("/runway");
});

describe("Final Polish: Desktop Sidebar & Document Scroll Shell", () => {
  it("uses natural document scrolling in AppLayout without md:h-dvh or overflow-hidden scroll traps", () => {
    const { container } = render(
      <DisplayPreferenceProvider>
        <AppLayout>
          <div>Runway Body</div>
        </AppLayout>
      </DisplayPreferenceProvider>
    );

    const shell = container.firstElementChild as HTMLElement | null;
    expect(shell?.className).toContain("min-h-dvh");
    expect(shell?.className).toContain("md:flex-row");
    expect(shell?.className).toContain("overflow-x-clip");
    expect(shell?.className).not.toContain("md:h-dvh");
    expect(shell?.className).not.toContain("md:overflow-hidden");

    const main = container.querySelector("main");
    expect(main?.className).not.toContain("md:overflow-y-auto");
    expect(main?.className).toContain("md:pb-10");
  });

  it("pins AppSidebar with sticky viewport height and DojoSideRail with lg:sticky lg:top-20", () => {
    const { container: sidebarContainer } = render(<AppSidebar />);
    const sidebarAside = sidebarContainer.querySelector("aside");
    expect(sidebarAside?.className).toContain("md:sticky");
    expect(sidebarAside?.className).toContain("md:top-0");
    expect(sidebarAside?.className).toContain("md:h-dvh");
    expect(sidebarAside?.className).toContain("md:shrink-0");
    expect(sidebarAside?.className).toContain("md:overflow-y-auto");

    const { container: railContainer } = render(
      <DojoSideRail
        progress={createInitialDojoProgress("2026-11-26T08:00:00.000Z")}
        onSelectLevel={vi.fn()}
        onOpenTrophyCase={vi.fn()}
        onOpenResearchLibrary={vi.fn()}
      />
    );
    const railAside = railContainer.querySelector("aside");
    expect(railAside?.className).toContain("lg:sticky");
    expect(railAside?.className).toContain("lg:top-20");
    expect(railAside?.className).not.toContain("lg:overflow-y-auto");
  });
});

describe("Final Polish: Landing Footer Attribution & Ambient Motion", () => {
  it("renders exact biley7 attribution alongside untouched guest/auth links on /", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(/© \d{4} StopBucks\. biley7 · Built for college & university students\./)
    ).toBeTruthy();

    const footer = document.querySelector("footer");
    expect(footer?.textContent).toContain("Try Instant Demo (Guest)");
    expect(footer?.textContent).toContain("Sign In / Start");
  });

  it("renders 16 deterministic GPU-composited tokens and disables continuous motion when reduced motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { rerender } = render(<LandingAmbientMotion />);

    const layer = screen.getByTestId("landing-ambient-motion");
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.getAttribute("data-reduced-motion")).toBe("false");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.className).toContain("select-none");
    expect(layer.className).toContain("overflow-hidden");
    expect(layer.className).toContain("z-0");

    const tokens = layer.querySelectorAll("[data-ambient-token]");
    expect(tokens.length).toBe(16);
    for (const token of Array.from(tokens)) {
      const el = token as HTMLElement;
      expect(el.className).toContain("landing-ambient-token");
      expect(Number.parseFloat(el.style.animationDelay)).toBeLessThan(0);
    }

    // Toggle reduced motion dynamically while open
    mockUseReducedMotion.mockReturnValue(true);
    rerender(<LandingAmbientMotion />);

    expect(layer.getAttribute("data-reduced-motion")).toBe("true");
    for (const token of Array.from(layer.querySelectorAll("[data-ambient-token]"))) {
      const el = token as HTMLElement;
      expect(el.className).not.toContain("landing-ambient-token");
      expect(el.style.animationDelay).toBe("");
      expect(el.style.transform).toContain("rotate(");
    }
  });

  it("reacts immediately when prefers-reduced-motion media query toggles while open", () => {
    const listeners = new Set<() => void>();
    const mql = {
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
    };
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => mql,
    });

    try {
      render(<LandingAmbientMotion />);
      const layer = screen.getByTestId("landing-ambient-motion");
      expect(layer.getAttribute("data-reduced-motion")).toBe("false");

      act(() => {
        mql.matches = true;
        listeners.forEach((cb) => cb());
      });
      expect(layer.getAttribute("data-reduced-motion")).toBe("true");
      expect(layer.querySelector(".landing-ambient-token")).toBeNull();

      act(() => {
        mql.matches = false;
        listeners.forEach((cb) => cb());
      });
      expect(layer.getAttribute("data-reduced-motion")).toBe("false");
      expect(layer.querySelectorAll(".landing-ambient-token")).toHaveLength(16);
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});

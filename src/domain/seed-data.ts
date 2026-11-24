/**
 * StopBucks Guest Sandbox Seed Dataset
 * Generates realistic student financial data for the demo environment.
 *
 * Requirements:
 * - ~30 days of realistic student transactions.
 * - All 5 trigger tags represented.
 * - Cash and cashless modes.
 * - Small cashless transactions (Cashless Numbness).
 * - Late-night transactions (Late-Night Drift).
 * - Social FOMO transactions.
 * - Intentional Self-Investment transactions.
 * - Two rescued Vault items and one cooling Vault item.
 * - Dates generated relative to current date.
 * - Deep-cloned to avoid shared mutable references.
 */

import type {
  Transaction,
  UserProfile,
  VaultItem,
} from "./types";

export interface GuestSeedState {
  profile: UserProfile;
  transactions: Transaction[];
  vaultItems: VaultItem[];
}

export function createInitialGuestState(referenceDate: Date = new Date()): GuestSeedState {
  const now = referenceDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;

  // Demo Profile:
  // Currency: INR
  // Monthly Budget: ₹20,000 (2,000,000 paise)
  // Self-Invest Target: ₹3,500 (350,000 paise)
  // Hourly Rate: ₹200 (20,000 paise)
  const profile: UserProfile = {
    userId: "guest-sandbox-user",
    currency: "INR",
    monthlyBudgetMinor: 2000000, // ₹20,000.00
    selfInvestTargetMinor: 350000, // ₹3,500.00
    hourlyRateMinor: 20000, // ₹200.00/hr
    createdAt: new Date(now - 35 * DAY_MS).toISOString(),
  };

  // Helper to format ISO date relative to referenceDate
  const relIso = (daysAgo: number, hourOfDay: number, minute: number = 0): string => {
    const d = new Date(now - daysAgo * DAY_MS);
    d.setUTCHours(hourOfDay, minute, 0, 0);
    // For "today", a fixed display hour may still be later than the supplied
    // reference instant. Clamp it so seed data never becomes future spending.
    return new Date(Math.min(d.getTime(), now)).toISOString();
  };

  // 30 days of realistic student transactions
  const transactions: Transaction[] = [
    // Today / Recent
    {
      id: "tx-guest-01",
      userId: profile.userId,
      amountMinor: 6000, // ₹60.00
      note: "Chai & biscuit canteen break",
      triggerTag: "convenience",
      paymentMode: "cashless",
      loggedAt: relIso(0, 11, 30),
      createdAt: relIso(0, 11, 30),
    },
    {
      id: "tx-guest-02",
      userId: profile.userId,
      amountMinor: 25000, // ₹250.00
      note: "Midnight Maggi & Red Bull cram session",
      triggerTag: "stress_late_night",
      paymentMode: "cashless",
      loggedAt: relIso(1, 23, 45),
      createdAt: relIso(1, 23, 45),
    },
    {
      id: "tx-guest-03",
      userId: profile.userId,
      amountMinor: 49900, // ₹499.00
      note: "Python Algorithm Mastery course",
      triggerTag: "invest_self",
      paymentMode: "cashless",
      loggedAt: relIso(2, 15, 0),
      createdAt: relIso(2, 15, 0),
    },
    {
      id: "tx-guest-04",
      userId: profile.userId,
      amountMinor: 8000, // ₹80.00
      note: "Bus pass refill",
      triggerTag: "need",
      paymentMode: "cash",
      loggedAt: relIso(3, 9, 15),
      createdAt: relIso(3, 9, 15),
    },
    {
      id: "tx-guest-05",
      userId: profile.userId,
      amountMinor: 120000, // ₹1,200.00
      note: "Weekend club rooftop dinner with batchmates",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
      loggedAt: relIso(4, 21, 30),
      createdAt: relIso(4, 21, 30),
    },
    {
      id: "tx-guest-06",
      userId: profile.userId,
      amountMinor: 15000, // ₹150.00
      note: "Stationery & engineering notebook",
      triggerTag: "need",
      paymentMode: "cash",
      loggedAt: relIso(5, 14, 10),
      createdAt: relIso(5, 14, 10),
    },
    {
      id: "tx-guest-07",
      userId: profile.userId,
      amountMinor: 4500, // ₹45.00 - Micro cashless
      note: "Vending machine cold coffee",
      triggerTag: "convenience",
      paymentMode: "cashless",
      loggedAt: relIso(6, 16, 20),
      createdAt: relIso(6, 16, 20),
    },
    {
      id: "tx-guest-08",
      userId: profile.userId,
      amountMinor: 38000, // ₹380.00
      note: "Late-night Swiggy biryani delivery after hackathon",
      triggerTag: "stress_late_night",
      paymentMode: "cashless",
      loggedAt: relIso(7, 2, 15),
      createdAt: relIso(7, 2, 15),
    },
    {
      id: "tx-guest-09",
      userId: profile.userId,
      amountMinor: 85000, // ₹850.00
      note: "Used Data Structures textbook (hard copy)",
      triggerTag: "invest_self",
      paymentMode: "cashless",
      loggedAt: relIso(8, 12, 0),
      createdAt: relIso(8, 12, 0),
    },
    {
      id: "tx-guest-10",
      userId: profile.userId,
      amountMinor: 3500, // ₹35.00 - Micro cashless
      note: "Photocopy and printouts",
      triggerTag: "need",
      paymentMode: "cashless",
      loggedAt: relIso(9, 10, 45),
      createdAt: relIso(9, 10, 45),
    },
    {
      id: "tx-guest-11",
      userId: profile.userId,
      amountMinor: 65000, // ₹650.00
      note: "Movie night ticket & popcorn with lab group",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
      loggedAt: relIso(10, 20, 0),
      createdAt: relIso(10, 20, 0),
    },
    {
      id: "tx-guest-12",
      userId: profile.userId,
      amountMinor: 12000, // ₹120.00
      note: "Campus mess lunch extra token",
      triggerTag: "need",
      paymentMode: "cash",
      loggedAt: relIso(11, 13, 0),
      createdAt: relIso(11, 13, 0),
    },
    {
      id: "tx-guest-13",
      userId: profile.userId,
      amountMinor: 2800, // ₹28.00 - Micro cashless
      note: "Quick mineral water bottle",
      triggerTag: "convenience",
      paymentMode: "cashless",
      loggedAt: relIso(12, 15, 30),
      createdAt: relIso(12, 15, 30),
    },
    {
      id: "tx-guest-14",
      userId: profile.userId,
      amountMinor: 32000, // ₹320.00
      note: "1 AM Domino's garlic bread stress binge",
      triggerTag: "stress_late_night",
      paymentMode: "cashless",
      loggedAt: relIso(13, 1, 10),
      createdAt: relIso(13, 1, 10),
    },
    {
      id: "tx-guest-15",
      userId: profile.userId,
      amountMinor: 120000, // ₹1,200.00
      note: "Campus gym 3-month fitness membership",
      triggerTag: "invest_self",
      paymentMode: "cashless",
      loggedAt: relIso(14, 18, 0),
      createdAt: relIso(14, 18, 0),
    },
    {
      id: "tx-guest-16",
      userId: profile.userId,
      amountMinor: 5500, // ₹55.00 - Micro cashless
      note: "Ice cream cup post-dinner",
      triggerTag: "convenience",
      paymentMode: "cashless",
      loggedAt: relIso(16, 21, 15),
      createdAt: relIso(16, 21, 15),
    },
    {
      id: "tx-guest-17",
      userId: profile.userId,
      amountMinor: 45000, // ₹450.00
      note: "Department festival custom t-shirt",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
      loggedAt: relIso(18, 16, 40),
      createdAt: relIso(18, 16, 40),
    },
    {
      id: "tx-guest-18",
      userId: profile.userId,
      amountMinor: 95000, // ₹950.00
      note: "Monthly grocery essentials & staples",
      triggerTag: "need",
      paymentMode: "cashless",
      loggedAt: relIso(20, 11, 0),
      createdAt: relIso(20, 11, 0),
    },
    {
      id: "tx-guest-19",
      userId: profile.userId,
      amountMinor: 2200, // ₹22.00 - Micro cashless
      note: "Pen replacement",
      triggerTag: "need",
      paymentMode: "cashless",
      loggedAt: relIso(22, 10, 0),
      createdAt: relIso(22, 10, 0),
    },
    {
      id: "tx-guest-20",
      userId: profile.userId,
      amountMinor: 18000, // ₹180.00
      note: "Auto rickshaw when late for exam",
      triggerTag: "convenience",
      paymentMode: "cash",
      loggedAt: relIso(24, 8, 45),
      createdAt: relIso(24, 8, 45),
    },
    {
      id: "tx-guest-21",
      userId: profile.userId,
      amountMinor: 75000, // ₹750.00
      note: "Cloud certification voucher installment",
      triggerTag: "invest_self",
      paymentMode: "cashless",
      loggedAt: relIso(26, 17, 30),
      createdAt: relIso(26, 17, 30),
    },
    {
      id: "tx-guest-22",
      userId: profile.userId,
      amountMinor: 48000, // ₹480.00
      note: "Birthday treat contribution for roommate",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
      loggedAt: relIso(28, 19, 0),
      createdAt: relIso(28, 19, 0),
    },
  ];

  // Vault Items:
  // - 2 rescued items (demonstrating money saved through cool-off)
  // - 1 currently cooling item (demonstrating active 48-hr cool-off timer)
  const vaultItems: VaultItem[] = [
    {
      id: "vault-guest-01",
      userId: profile.userId,
      itemName: "RGB Mechanical Keyboard",
      priceMinor: 349900, // ₹3,499.00
      triggerTag: "convenience",
      unlockAt: new Date(now - 12 * DAY_MS).toISOString(),
      status: "rescued",
      resolvedAt: new Date(now - 10 * DAY_MS).toISOString(),
      createdAt: new Date(now - 14 * DAY_MS).toISOString(),
    },
    {
      id: "vault-guest-02",
      userId: profile.userId,
      itemName: "Designer Sneaker Flash Sale",
      priceMinor: 499900, // ₹4,999.00
      triggerTag: "social_fomo",
      unlockAt: new Date(now - 5 * DAY_MS).toISOString(),
      status: "rescued",
      resolvedAt: new Date(now - 3 * DAY_MS).toISOString(),
      createdAt: new Date(now - 7 * DAY_MS).toISOString(),
    },
    {
      id: "vault-guest-03",
      userId: profile.userId,
      itemName: "Noise-Cancelling Wireless Earbuds",
      priceMinor: 279900, // ₹2,799.00
      triggerTag: "stress_late_night",
      // Cools off 30 hours from now (18 hours into 48-hour cool off)
      unlockAt: new Date(now + 30 * HOUR_MS).toISOString(),
      status: "cooling",
      resolvedAt: null,
      createdAt: new Date(now - 18 * HOUR_MS).toISOString(),
    },
  ];

  return {
    profile,
    transactions,
    vaultItems,
  };
}


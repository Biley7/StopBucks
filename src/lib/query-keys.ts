/** Identity-scoped TanStack Query keys. Never share financial data by mode/user. */
export type CacheIdentity =
  | { mode: "guest"; userId: "guest-sandbox-user" }
  | { mode: "authenticated"; userId: string }
  | { mode: "none"; userId: null };

export const queryKeys = {
  profile: (identity: CacheIdentity) => ["profile", identity.mode, identity.userId] as const,
  transactions: (identity: CacheIdentity) => ["transactions", identity.mode, identity.userId] as const,
  vaultItems: (identity: CacheIdentity) => ["vaultItems", identity.mode, identity.userId] as const,
  fixedCommitments: (identity: CacheIdentity) =>
    ["fixed-commitments", identity.mode, identity.userId] as const,
  weeklyNudge: (identity: CacheIdentity, weekKey: string) =>
    ["weekly-nudge", identity.mode, identity.userId, weekKey] as const,
  dojoProgress: (identity: CacheIdentity) =>
    ["dojo-progress", identity.mode, identity.userId] as const,
};

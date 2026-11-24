/**
 * StopBucks Guest Sandbox Repository
 *
 * Implements IStopBucksRepository using browser sessionStorage.
 * - Initialized with realistic seed data.
 * - Persists mutations across page reloads during the session.
 * - Reset mechanism restores pristine seed state.
 * - SSR safe: Never touches window or sessionStorage on the server.
 * - Completely isolated from authenticated user data.
 */

import { createInitialGuestState, type GuestSeedState } from "@/domain/seed-data";
import type {
  CreateProfileInput,
  CreateTransactionInput,
  CreateVaultItemInput,
  ResolveVaultItemInput,
  SaveWeeklyNudgeInput,
  Transaction,
  UpdateProfileInput,
  UpdateTransactionInput,
  UserProfile,
  VaultItem,
  VaultPurchaseResult,
  WeeklyNudge,
} from "@/domain/types";
import type { IStopBucksRepository } from "./repository.interface";

const GUEST_STORAGE_KEY = "stopbucks_guest_sandbox_v1";

interface GuestStoragePayload {
  version: 1;
  state: GuestSeedState;
  weeklyNudges: Record<string, WeeklyNudge>;
}

export class GuestSandboxRepository implements IStopBucksRepository {
  public readonly isGuest = true;
  private inMemoryCache: GuestStoragePayload | null = null;

  constructor() {
    // If in browser, initialize or load cache
    if (typeof window !== "undefined") {
      this.inMemoryCache = this.loadFromStorage();
    }
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  }

  private getFreshInitialState(): GuestStoragePayload {
    return {
      version: 1,
      state: createInitialGuestState(),
      weeklyNudges: {},
    };
  }

  private loadFromStorage(): GuestStoragePayload {
    if (!this.isBrowser()) {
      return this.inMemoryCache || this.getFreshInitialState();
    }

    try {
      const raw = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (!raw) {
        const initial = this.getFreshInitialState();
        this.saveToStorage(initial);
        return initial;
      }

      const parsed = JSON.parse(raw) as GuestStoragePayload;
      if (parsed && parsed.version === 1 && parsed.state && parsed.state.profile) {
        return parsed;
      }

      // If corrupted or mismatched version, reset gracefully
      const fallback = this.getFreshInitialState();
      this.saveToStorage(fallback);
      return fallback;
    } catch {
      const fallback = this.getFreshInitialState();
      this.saveToStorage(fallback);
      return fallback;
    }
  }

  private saveToStorage(payload: GuestStoragePayload): void {
    this.inMemoryCache = payload;
    if (this.isBrowser()) {
      try {
        window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn("StopBucks GuestSandbox: failed to persist to sessionStorage", err);
      }
    }
  }

  private getState(): GuestStoragePayload {
    if (!this.inMemoryCache) {
      this.inMemoryCache = this.loadFromStorage();
    }
    return this.inMemoryCache;
  }

  // Profile Methods
  async getProfile(): Promise<UserProfile | null> {
    const payload = this.getState();
    return payload.state.profile ? { ...payload.state.profile } : null;
  }

  async createProfile(input: CreateProfileInput): Promise<UserProfile> {
    const payload = this.getState();
    const newProfile: UserProfile = {
      userId: "guest-sandbox-user",
      currency: input.currency,
      monthlyBudgetMinor: input.monthlyBudgetMinor,
      selfInvestTargetMinor: input.selfInvestTargetMinor,
      hourlyRateMinor: input.hourlyRateMinor,
      createdAt: new Date().toISOString(),
    };
    payload.state.profile = newProfile;
    this.saveToStorage(payload);
    return { ...newProfile };
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const payload = this.getState();
    if (!payload.state.profile) {
      return this.createProfile({
        currency: input.currency ?? "INR",
        monthlyBudgetMinor: input.monthlyBudgetMinor ?? 2000000,
        selfInvestTargetMinor: input.selfInvestTargetMinor ?? 350000,
        hourlyRateMinor: input.hourlyRateMinor ?? 20000,
      });
    }

    payload.state.profile = {
      ...payload.state.profile,
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.monthlyBudgetMinor !== undefined && {
        monthlyBudgetMinor: input.monthlyBudgetMinor,
      }),
      ...(input.selfInvestTargetMinor !== undefined && {
        selfInvestTargetMinor: input.selfInvestTargetMinor,
      }),
      ...(input.hourlyRateMinor !== undefined && {
        hourlyRateMinor: input.hourlyRateMinor,
      }),
    };

    this.saveToStorage(payload);
    return { ...payload.state.profile };
  }

  // Transactions Methods
  async getTransactions(): Promise<Transaction[]> {
    const payload = this.getState();
    // Return sorted newest first
    return [...payload.state.transactions].sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );
  }

  async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const payload = this.getState();
    const nowIso = new Date().toISOString();
    const newTx: Transaction = {
      id: `tx-guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: payload.state.profile.userId,
      amountMinor: input.amountMinor,
      note: input.note || "",
      triggerTag: input.triggerTag,
      paymentMode: input.paymentMode,
      loggedAt: input.loggedAt || nowIso,
      createdAt: nowIso,
    };

    payload.state.transactions.unshift(newTx);
    this.saveToStorage(payload);
    return { ...newTx };
  }

  async updateTransaction(
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const payload = this.getState();
    const idx = payload.state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new Error(`Transaction with id "${id}" not found.`);
    }

    const current = payload.state.transactions[idx];
    const updated: Transaction = {
      ...current,
      ...(input.amountMinor !== undefined && { amountMinor: input.amountMinor }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.triggerTag !== undefined && { triggerTag: input.triggerTag }),
      ...(input.paymentMode !== undefined && { paymentMode: input.paymentMode }),
      ...(input.loggedAt !== undefined && { loggedAt: input.loggedAt }),
    };

    payload.state.transactions[idx] = updated;
    this.saveToStorage(payload);
    return { ...updated };
  }

  async deleteTransaction(id: string): Promise<void> {
    const payload = this.getState();
    const beforeCount = payload.state.transactions.length;
    payload.state.transactions = payload.state.transactions.filter((t) => t.id !== id);
    if (payload.state.transactions.length === beforeCount) {
      throw new Error(`Transaction with id "${id}" not found.`);
    }
    this.saveToStorage(payload);
  }

  // Vault Items Methods
  async getVaultItems(): Promise<VaultItem[]> {
    const payload = this.getState();
    return [...payload.state.vaultItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async addVaultItem(input: CreateVaultItemInput): Promise<VaultItem> {
    const payload = this.getState();
    const now = new Date();
    const unlockAt = input.unlockAt
      ? input.unlockAt
      : new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    const newItem: VaultItem = {
      id: `vault-guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: payload.state.profile.userId,
      itemName: input.itemName,
      priceMinor: input.priceMinor,
      triggerTag: input.triggerTag,
      unlockAt,
      status: "cooling",
      resolvedAt: null,
      createdAt: now.toISOString(),
    };

    payload.state.vaultItems.unshift(newItem);
    this.saveToStorage(payload);
    return { ...newItem };
  }

  async updateVaultItem(
    id: string,
    input: Partial<CreateVaultItemInput>
  ): Promise<VaultItem> {
    const payload = this.getState();
    const idx = payload.state.vaultItems.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Vault item with id "${id}" not found.`);
    }

    const current = payload.state.vaultItems[idx];
    const updated: VaultItem = {
      ...current,
      ...(input.itemName !== undefined && { itemName: input.itemName }),
      ...(input.priceMinor !== undefined && { priceMinor: input.priceMinor }),
      ...(input.triggerTag !== undefined && { triggerTag: input.triggerTag }),
      ...(input.unlockAt !== undefined && { unlockAt: input.unlockAt }),
    };

    payload.state.vaultItems[idx] = updated;
    this.saveToStorage(payload);
    return { ...updated };
  }

  async resolveVaultItem(
    id: string,
    input: ResolveVaultItemInput
  ): Promise<VaultItem> {
    const payload = this.getState();
    const idx = payload.state.vaultItems.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Vault item with id "${id}" not found.`);
    }

    const current = payload.state.vaultItems[idx];
    if (current.status !== "cooling") {
      throw new Error(
        `Vault item "${id}" is already resolved as "${current.status}".`
      );
    }
    if (input.status === "purchased") {
      throw new Error(
        "Purchased resolutions must use resolveVaultPurchase() so the transaction stays in sync."
      );
    }
    if (new Date(current.unlockAt).getTime() > Date.now()) {
      throw new Error(`Vault item "${id}" is still cooling and cannot be resolved yet.`);
    }

    const updated: VaultItem = {
      ...current,
      status: input.status,
      resolvedAt: input.resolvedAt || new Date().toISOString(),
    };

    payload.state.vaultItems[idx] = updated;
    this.saveToStorage(payload);
    return { ...updated };
  }

  /**
   * Atomic guest transition: mark the item purchased and append exactly one
   * transaction in a single persisted state write.
   */
  async resolveVaultPurchase(id: string): Promise<VaultPurchaseResult> {
    const payload = this.getState();
    const idx = payload.state.vaultItems.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Vault item with id "${id}" not found.`);
    }

    const current = payload.state.vaultItems[idx];
    if (current.status !== "cooling") {
      throw new Error(
        `Vault item "${id}" is already resolved as "${current.status}".`
      );
    }
    if (new Date(current.unlockAt).getTime() > Date.now()) {
      throw new Error(`Vault item "${id}" is still cooling and cannot be resolved yet.`);
    }

    const nowIso = new Date().toISOString();
    const transaction: Transaction = {
      id: `tx-vault-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: payload.state.profile.userId,
      amountMinor: current.priceMinor,
      note: current.itemName,
      triggerTag: current.triggerTag,
      paymentMode: "cashless",
      loggedAt: nowIso,
      createdAt: nowIso,
    };

    const updatedItem: VaultItem = {
      ...current,
      status: "purchased",
      resolvedAt: nowIso,
    };

    const nextVaultItems = [...payload.state.vaultItems];
    nextVaultItems[idx] = updatedItem;

    // Single write derived from a copy: both changes commit together or neither does.
    const nextPayload: GuestStoragePayload = {
      version: 1,
      state: {
        ...payload.state,
        vaultItems: nextVaultItems,
        transactions: [transaction, ...payload.state.transactions],
      },
      weeklyNudges: payload.weeklyNudges,
    };

    this.saveToStorage(nextPayload);

    return { item: { ...updatedItem }, transaction: { ...transaction } };
  }

  /**
   * Guest demo control: unlock a cooling item immediately (no system clock change).
   */
  async simulateVaultUnlock(id: string): Promise<VaultItem> {
    const payload = this.getState();
    const idx = payload.state.vaultItems.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Vault item with id "${id}" not found.`);
    }

    const current = payload.state.vaultItems[idx];
    if (current.status !== "cooling") {
      throw new Error(
        `Vault item "${id}" is already resolved as "${current.status}".`
      );
    }
    const updated: VaultItem = {
      ...current,
      unlockAt: new Date(Date.now() - 60 * 1000).toISOString(),
    };

    payload.state.vaultItems[idx] = updated;
    this.saveToStorage(payload);
    return { ...updated };
  }

  // Weekly Nudges Methods
  async getWeeklyNudge(weekKey: string): Promise<WeeklyNudge | null> {
    const payload = this.getState();
    const nudge = payload.weeklyNudges[weekKey];
    return nudge ? { ...nudge } : null;
  }

  async saveWeeklyNudge(input: SaveWeeklyNudgeInput): Promise<WeeklyNudge> {
    const payload = this.getState();
    const saved: WeeklyNudge = {
      id: `nudge-guest-${input.weekKey}`,
      userId: payload.state.profile.userId,
      weekKey: input.weekKey,
      biasSnapshot: input.biasSnapshot,
      coachResponse: input.coachResponse,
      createdAt: new Date().toISOString(),
    };

    payload.weeklyNudges[input.weekKey] = saved;
    this.saveToStorage(payload);
    return { ...saved };
  }

  // Guest Sandbox Reset
  async resetDemo(): Promise<void> {
    const fresh = this.getFreshInitialState();
    this.saveToStorage(fresh);
  }
}


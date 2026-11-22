/**
 * StopBucks Repository Interface Contract
 * Both Authenticated (Supabase) and Guest (SessionStorage) modes
 * implement this exact interface.
 *
 * UI components and domain functions must never directly know whether
 * the user is a guest or authenticated.
 */

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
  WeeklyNudge,
} from "@/domain/types";

export interface IStopBucksRepository {
  /**
   * Identifies whether this repository instance is operating in Guest Sandbox mode.
   */
  readonly isGuest: boolean;

  // Profile
  getProfile(): Promise<UserProfile | null>;
  createProfile(input: CreateProfileInput): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  addTransaction(input: CreateTransactionInput): Promise<Transaction>;
  updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Vault Items
  getVaultItems(): Promise<VaultItem[]>;
  addVaultItem(input: CreateVaultItemInput): Promise<VaultItem>;
  updateVaultItem(id: string, input: Partial<CreateVaultItemInput>): Promise<VaultItem>;
  resolveVaultItem(id: string, input: ResolveVaultItemInput): Promise<VaultItem>;

  // Weekly Nudges
  getWeeklyNudge(weekKey: string): Promise<WeeklyNudge | null>;
  saveWeeklyNudge(input: SaveWeeklyNudgeInput): Promise<WeeklyNudge>;

  // Guest Sandbox Demo Control
  resetDemo(): Promise<void>;
}


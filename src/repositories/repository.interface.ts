/**
 * StopBucks Repository Interface Contract
 * Both Authenticated (Supabase) and Guest (SessionStorage) modes
 * implement this exact interface.
 *
 * UI components and domain functions must never directly know whether
 * the user is a guest or authenticated.
 */

import type { DojoProgress } from "@/domain/dojo-types";
import type {
  CreateFixedCommitmentInput,
  CreateProfileInput,
  CreateTransactionInput,
  CreateVaultItemInput,
  FixedCommitment,
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

  // Fixed Commitments
  getFixedCommitments(): Promise<FixedCommitment[]>;
  addFixedCommitment(input: CreateFixedCommitmentInput): Promise<FixedCommitment>;
  deleteFixedCommitment(id: string): Promise<void>;

  // Vault Items
  getVaultItems(): Promise<VaultItem[]>;
  addVaultItem(input: CreateVaultItemInput): Promise<VaultItem>;
  updateVaultItem(id: string, input: Partial<CreateVaultItemInput>): Promise<VaultItem>;
  resolveVaultItem(id: string, input: ResolveVaultItemInput): Promise<VaultItem>;
  /**
   * Atomically resolve a cooled-off Vault item as purchased and create exactly
   * one matching transaction. Rejects already-resolved or still-cooling items.
   */
  resolveVaultPurchase(id: string): Promise<VaultPurchaseResult>;
  /**
   * Guest Sandbox demo control: move a cooling item's unlock time into the past.
   * Authenticated repositories reject this operation.
   */
  simulateVaultUnlock(id: string): Promise<VaultItem>;

  // Weekly Nudges
  getWeeklyNudge(weekKey: string): Promise<WeeklyNudge | null>;
  saveWeeklyNudge(input: SaveWeeklyNudgeInput): Promise<WeeklyNudge>;

  // Dojo Learning Progression
  getDojoProgress(): Promise<DojoProgress>;
  saveDojoProgress(progress: DojoProgress): Promise<DojoProgress>;

  // Guest Sandbox Demo Control
  resetDemo(): Promise<void>;
}


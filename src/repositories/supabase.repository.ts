/**
 * StopBucks Authenticated Supabase Repository
 *
 * Implements IStopBucksRepository using the Supabase client.
 * Enforces ownership via Supabase Row-Level Security (auth.uid() = user_id).
 * Never swallows database errors; sanitizes thrown errors into user-safe messages.
 * Never accesses service-role credentials.
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import {
  createFixedCommitmentSchema,
  currencySchema,
  paymentModeSchema,
  triggerTagSchema,
  vaultStatusSchema,
} from "@/lib/schemas";
import type { IStopBucksRepository } from "./repository.interface";

// Row schemas for runtime database validation
const dbProfileRowSchema = z.object({
  user_id: z.string().min(1),
  currency: currencySchema,
  monthly_budget_minor: z.coerce.number().int().nonnegative(),
  self_invest_target_minor: z.coerce.number().int().nonnegative(),
  hourly_rate_minor: z.coerce.number().int().positive(),
  created_at: z.string().min(1),
});

const dbTransactionRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  amount_minor: z.coerce.number().int().positive(),
  note: z.string().default(""),
  trigger_tag: triggerTagSchema,
  payment_mode: paymentModeSchema,
  logged_at: z.string().min(1),
  created_at: z.string().min(1),
});

const dbVaultItemRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  item_name: z.string().min(1),
  price_minor: z.coerce.number().int().positive(),
  trigger_tag: triggerTagSchema,
  unlock_at: z.string().min(1),
  status: vaultStatusSchema,
  resolved_at: z.string().nullable().optional(),
  created_at: z.string().min(1),
});

const dbWeeklyNudgeRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  week_key: z.string().min(1),
  bias_snapshot: z.record(z.unknown()),
  coach_response: z.record(z.unknown()),
  created_at: z.string().min(1),
});

export const dbFixedCommitmentRowSchema = z.object({
  id: z.string().uuid("Invalid UUID for id"),
  user_id: z.string().uuid("Invalid UUID for user_id"),
  title: z.string().trim().min(1).max(80),
  amount_minor: z.preprocess((val) => {
    if (typeof val === "string") {
      try {
        const b = BigInt(val);
        if (b > BigInt(Number.MAX_SAFE_INTEGER) || b < BigInt(-Number.MAX_SAFE_INTEGER)) {
          return NaN;
        }
        return Number(b);
      } catch {
        return NaN;
      }
    }
    return val;
  }, z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
  created_at: z.string().min(1),
});

export function mapFixedCommitmentRow(raw: unknown): FixedCommitment {
  const parsed = dbFixedCommitmentRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid fixed commitment row data:", parsed.error);
    throw new Error("Invalid fixed commitment data received from database.");
  }
  return {
    id: parsed.data.id,
    userId: parsed.data.user_id,
    title: parsed.data.title,
    amountMinor: parsed.data.amount_minor,
    createdAt: parsed.data.created_at,
  };
}

export function mapProfileRow(raw: unknown): UserProfile {
  const parsed = dbProfileRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid profile row data:", parsed.error);
    throw new Error("Invalid profile data received from database.");
  }
  return {
    userId: parsed.data.user_id,
    currency: parsed.data.currency,
    monthlyBudgetMinor: parsed.data.monthly_budget_minor,
    selfInvestTargetMinor: parsed.data.self_invest_target_minor,
    hourlyRateMinor: parsed.data.hourly_rate_minor,
    createdAt: parsed.data.created_at,
  };
}

export function mapTransactionRow(raw: unknown): Transaction {
  const parsed = dbTransactionRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid transaction row data:", parsed.error);
    throw new Error("Invalid transaction data received from database.");
  }
  return {
    id: parsed.data.id,
    userId: parsed.data.user_id,
    amountMinor: parsed.data.amount_minor,
    note: parsed.data.note,
    triggerTag: parsed.data.trigger_tag,
    paymentMode: parsed.data.payment_mode,
    loggedAt: parsed.data.logged_at,
    createdAt: parsed.data.created_at,
  };
}

export function mapVaultItemRow(raw: unknown): VaultItem {
  const parsed = dbVaultItemRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid vault item row data:", parsed.error);
    throw new Error("Invalid vault item data received from database.");
  }
  return {
    id: parsed.data.id,
    userId: parsed.data.user_id,
    itemName: parsed.data.item_name,
    priceMinor: parsed.data.price_minor,
    triggerTag: parsed.data.trigger_tag,
    unlockAt: parsed.data.unlock_at,
    status: parsed.data.status,
    resolvedAt: parsed.data.resolved_at ?? null,
    createdAt: parsed.data.created_at,
  };
}

export function mapWeeklyNudgeRow(raw: unknown): WeeklyNudge {
  const parsed = dbWeeklyNudgeRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid weekly nudge row data:", parsed.error);
    throw new Error("Invalid weekly nudge data received from database.");
  }
  return {
    id: parsed.data.id,
    userId: parsed.data.user_id,
    weekKey: parsed.data.week_key,
    biasSnapshot: parsed.data.bias_snapshot as unknown as WeeklyNudge["biasSnapshot"],
    coachResponse: parsed.data.coach_response,
    createdAt: parsed.data.created_at,
  };
}

function sanitizeDbError(action: string, error: unknown): Error {
  console.error(`[SupabaseRepository] Failed to ${action}:`, error);
  return new Error(`Unable to ${action}. Please try again.`);
}

export class SupabaseRepository implements IStopBucksRepository {
  public readonly isGuest = false;

  constructor(
    private readonly client: SupabaseClient,
    private readonly fixedUserId?: string
  ) {}

  private async getUserId(): Promise<string> {
    if (this.fixedUserId) {
      return this.fixedUserId;
    }
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (error || !user) {
      throw new Error("User must be authenticated to perform this repository operation.");
    }
    return user.id;
  }

  // Profile Methods
  async getProfile(): Promise<UserProfile | null> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw sanitizeDbError("fetch user profile", error);
    }

    if (!data) return null;
    return mapProfileRow(data);
  }

  async createProfile(input: CreateProfileInput): Promise<UserProfile> {
    const userId = await this.getUserId();

    const insertPayload = {
      user_id: userId,
      currency: input.currency,
      monthly_budget_minor: input.monthlyBudgetMinor,
      self_invest_target_minor: input.selfInvestTargetMinor,
      hourly_rate_minor: input.hourlyRateMinor,
    };

    // Use upsert on user_id to prevent PK race conditions across concurrent tabs
    const { data, error } = await this.client
      .from("profiles")
      .upsert(insertPayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("create profile", error);
    }

    return mapProfileRow(data);
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const userId = await this.getUserId();

    const updatePayload: Record<string, unknown> = {};
    if (input.currency !== undefined) updatePayload.currency = input.currency;
    if (input.monthlyBudgetMinor !== undefined)
      updatePayload.monthly_budget_minor = input.monthlyBudgetMinor;
    if (input.selfInvestTargetMinor !== undefined)
      updatePayload.self_invest_target_minor = input.selfInvestTargetMinor;
    if (input.hourlyRateMinor !== undefined)
      updatePayload.hourly_rate_minor = input.hourlyRateMinor;

    const { data, error } = await this.client
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("update profile", error);
    }

    return mapProfileRow(data);
  }

  // Transactions Methods
  async getTransactions(): Promise<Transaction[]> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false });

    if (error) {
      throw sanitizeDbError("fetch transactions", error);
    }

    return (data as unknown[]).map(mapTransactionRow);
  }

  async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const userId = await this.getUserId();
    const nowIso = new Date().toISOString();

    const { data, error } = await this.client
      .from("transactions")
      .insert({
        user_id: userId,
        amount_minor: input.amountMinor,
        note: input.note || "",
        trigger_tag: input.triggerTag,
        payment_mode: input.paymentMode,
        logged_at: input.loggedAt || nowIso,
      })
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("add transaction", error);
    }

    return mapTransactionRow(data);
  }

  async updateTransaction(
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const userId = await this.getUserId();

    const updatePayload: Record<string, unknown> = {};
    if (input.amountMinor !== undefined) updatePayload.amount_minor = input.amountMinor;
    if (input.note !== undefined) updatePayload.note = input.note;
    if (input.triggerTag !== undefined) updatePayload.trigger_tag = input.triggerTag;
    if (input.paymentMode !== undefined) updatePayload.payment_mode = input.paymentMode;
    if (input.loggedAt !== undefined) updatePayload.logged_at = input.loggedAt;

    const { data, error } = await this.client
      .from("transactions")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw sanitizeDbError(`update transaction "${id}"`, error);
    }

    return mapTransactionRow(data);
  }

  async deleteTransaction(id: string): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await this.client
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw sanitizeDbError(`delete transaction "${id}"`, error);
    }
  }

  // Vault Items Methods
  async getVaultItems(): Promise<VaultItem[]> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("vault_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw sanitizeDbError("fetch vault items", error);
    }

    return (data as unknown[]).map(mapVaultItemRow);
  }

  async addVaultItem(input: CreateVaultItemInput): Promise<VaultItem> {
    const userId = await this.getUserId();
    const unlockAt = input.unlockAt
      ? input.unlockAt
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.client
      .from("vault_items")
      .insert({
        user_id: userId,
        item_name: input.itemName,
        price_minor: input.priceMinor,
        trigger_tag: input.triggerTag,
        unlock_at: unlockAt,
        status: "cooling",
      })
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("add vault item", error);
    }

    return mapVaultItemRow(data);
  }

  async updateVaultItem(
    id: string,
    input: Partial<CreateVaultItemInput>
  ): Promise<VaultItem> {
    const userId = await this.getUserId();

    const updatePayload: Record<string, unknown> = {};
    if (input.itemName !== undefined) updatePayload.item_name = input.itemName;
    if (input.priceMinor !== undefined) updatePayload.price_minor = input.priceMinor;
    if (input.triggerTag !== undefined) updatePayload.trigger_tag = input.triggerTag;
    if (input.unlockAt !== undefined) updatePayload.unlock_at = input.unlockAt;

    const { data, error } = await this.client
      .from("vault_items")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw sanitizeDbError(`update vault item "${id}"`, error);
    }

    return mapVaultItemRow(data);
  }

  async resolveVaultItem(
    id: string,
    input: ResolveVaultItemInput
  ): Promise<VaultItem> {
    const userId = await this.getUserId();

    if (input.status === "purchased") {
      throw new Error(
        "Purchased resolutions must use resolveVaultPurchase() so the transaction stays in sync."
      );
    }

    const { data, error } = await this.client
      .from("vault_items")
      .update({
        status: input.status,
        resolved_at: input.resolvedAt || new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "cooling")
      .lte("unlock_at", new Date().toISOString())
      .select()
      .maybeSingle();

    if (!error && !data) {
      throw new Error(
        `Vault item "${id}" is not available for resolution (already resolved or missing).`
      );
    }

    if (error) {
      throw sanitizeDbError(`resolve vault item "${id}"`, error);
    }

    return mapVaultItemRow(data);
  }

  /**
   * Atomic purchase resolution through the resolve_vault_purchase RPC:
   * the vault status update and the transaction insert happen in one database
   * transaction, guarded by ownership, status and unlock-time checks.
   */
  async resolveVaultPurchase(id: string): Promise<VaultPurchaseResult> {
    const { data, error } = await this.client.rpc("resolve_vault_purchase", {
      p_vault_item_id: id,
    });

    if (error) {
      throw sanitizeDbError(`resolve vault purchase "${id}"`, error);
    }

    if (!data || typeof data !== "object") {
      throw new Error(`Vault purchase "${id}" returned no result.`);
    }

    const payload = data as { item?: unknown; transaction?: unknown };
    if (!payload.item || !payload.transaction) {
      throw new Error(`Vault purchase "${id}" returned an incomplete result.`);
    }

    return {
      item: mapVaultItemRow(payload.item),
      transaction: mapTransactionRow(payload.transaction),
    };
  }

  /** Demo-only control; authenticated data must respect real elapsed time. */
  async simulateVaultUnlock(_id: string): Promise<VaultItem> {
    throw new Error("Simulated vault unlocks are only available in Guest Sandbox mode.");
  }

  // Weekly Nudges Methods
  async getWeeklyNudge(weekKey: string): Promise<WeeklyNudge | null> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("weekly_nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("week_key", weekKey)
      .maybeSingle();

    if (error) {
      throw sanitizeDbError("fetch weekly nudge", error);
    }

    if (!data) return null;
    return mapWeeklyNudgeRow(data);
  }

  async saveWeeklyNudge(input: SaveWeeklyNudgeInput): Promise<WeeklyNudge> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("weekly_nudges")
      .upsert(
        {
          user_id: userId,
          week_key: input.weekKey,
          bias_snapshot: input.biasSnapshot,
          coach_response: input.coachResponse,
        },
        { onConflict: "user_id,week_key" }
      )
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("save weekly nudge", error);
    }

    return mapWeeklyNudgeRow(data);
  }

  // Fixed Commitments Methods
  async getFixedCommitments(): Promise<FixedCommitment[]> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("fixed_commitments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw sanitizeDbError("fetch fixed commitments", error);
    }

    return (data ?? []).map(mapFixedCommitmentRow);
  }

  async addFixedCommitment(input: CreateFixedCommitmentInput): Promise<FixedCommitment> {
    const validated = createFixedCommitmentSchema.parse(input);
    const userId = await this.getUserId();

    const insertPayload = {
      user_id: userId,
      title: validated.title,
      amount_minor: validated.amountMinor,
    };

    const { data, error } = await this.client
      .from("fixed_commitments")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw sanitizeDbError("add fixed commitment", error);
    }

    return mapFixedCommitmentRow(data);
  }

  async deleteFixedCommitment(id: string): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await this.client
      .from("fixed_commitments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw sanitizeDbError("delete fixed commitment", error);
    }
  }

  // Demo reset is disallowed for authenticated users
  async resetDemo(): Promise<void> {
    throw new Error("Demo reset is only supported in Guest Sandbox mode.");
  }
}

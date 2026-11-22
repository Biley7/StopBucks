/**
 * StopBucks Authenticated Supabase Repository
 *
 * Implements IStopBucksRepository using the Supabase client.
 * Enforces ownership via Supabase Row-Level Security (auth.uid() = user_id).
 * Never swallows database errors; propagates meaningful typed errors.
 * Never accesses service-role credentials.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
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
import type { IStopBucksRepository } from "./repository.interface";

interface DbProfile {
  user_id: string;
  currency: string;
  monthly_budget_minor: number;
  self_invest_target_minor: number;
  hourly_rate_minor: number;
  created_at: string;
}

interface DbTransaction {
  id: string;
  user_id: string;
  amount_minor: number;
  note: string;
  trigger_tag: string;
  payment_mode: string;
  logged_at: string;
  created_at: string;
}

interface DbVaultItem {
  id: string;
  user_id: string;
  item_name: string;
  price_minor: number;
  trigger_tag: string;
  unlock_at: string;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

interface DbWeeklyNudge {
  id: string;
  user_id: string;
  week_key: string;
  bias_snapshot: Record<string, unknown>;
  coach_response: Record<string, unknown>;
  created_at: string;
}

export class SupabaseRepository implements IStopBucksRepository {
  public readonly isGuest = false;

  constructor(private readonly client: SupabaseClient) {}

  private async getUserId(): Promise<string> {
    const { data: { user }, error } = await this.client.auth.getUser();
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
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) return null;

    const row = data as DbProfile;
    return {
      userId: row.user_id,
      currency: row.currency as UserProfile["currency"],
      monthlyBudgetMinor: Number(row.monthly_budget_minor),
      selfInvestTargetMinor: Number(row.self_invest_target_minor),
      hourlyRateMinor: Number(row.hourly_rate_minor),
      createdAt: row.created_at,
    };
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

    const { data, error } = await this.client
      .from("profiles")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    const row = data as DbProfile;
    return {
      userId: row.user_id,
      currency: row.currency as UserProfile["currency"],
      monthlyBudgetMinor: Number(row.monthly_budget_minor),
      selfInvestTargetMinor: Number(row.self_invest_target_minor),
      hourlyRateMinor: Number(row.hourly_rate_minor),
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    const row = data as DbProfile;
    return {
      userId: row.user_id,
      currency: row.currency as UserProfile["currency"],
      monthlyBudgetMinor: Number(row.monthly_budget_minor),
      selfInvestTargetMinor: Number(row.self_invest_target_minor),
      hourlyRateMinor: Number(row.hourly_rate_minor),
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return (data as DbTransaction[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      amountMinor: Number(row.amount_minor),
      note: row.note,
      triggerTag: row.trigger_tag as Transaction["triggerTag"],
      paymentMode: row.payment_mode as Transaction["paymentMode"],
      loggedAt: row.logged_at,
      createdAt: row.created_at,
    }));
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
      throw new Error(`Failed to add transaction: ${error.message}`);
    }

    const row = data as DbTransaction;
    return {
      id: row.id,
      userId: row.user_id,
      amountMinor: Number(row.amount_minor),
      note: row.note,
      triggerTag: row.trigger_tag as Transaction["triggerTag"],
      paymentMode: row.payment_mode as Transaction["paymentMode"],
      loggedAt: row.logged_at,
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to update transaction "${id}": ${error.message}`);
    }

    const row = data as DbTransaction;
    return {
      id: row.id,
      userId: row.user_id,
      amountMinor: Number(row.amount_minor),
      note: row.note,
      triggerTag: row.trigger_tag as Transaction["triggerTag"],
      paymentMode: row.payment_mode as Transaction["paymentMode"],
      loggedAt: row.logged_at,
      createdAt: row.created_at,
    };
  }

  async deleteTransaction(id: string): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await this.client
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete transaction "${id}": ${error.message}`);
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
      throw new Error(`Failed to fetch vault items: ${error.message}`);
    }

    return (data as DbVaultItem[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      itemName: row.item_name,
      priceMinor: Number(row.price_minor),
      triggerTag: row.trigger_tag as VaultItem["triggerTag"],
      unlockAt: row.unlock_at,
      status: row.status as VaultItem["status"],
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    }));
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
      throw new Error(`Failed to add vault item: ${error.message}`);
    }

    const row = data as DbVaultItem;
    return {
      id: row.id,
      userId: row.user_id,
      itemName: row.item_name,
      priceMinor: Number(row.price_minor),
      triggerTag: row.trigger_tag as VaultItem["triggerTag"],
      unlockAt: row.unlock_at,
      status: row.status as VaultItem["status"],
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to update vault item "${id}": ${error.message}`);
    }

    const row = data as DbVaultItem;
    return {
      id: row.id,
      userId: row.user_id,
      itemName: row.item_name,
      priceMinor: Number(row.price_minor),
      triggerTag: row.trigger_tag as VaultItem["triggerTag"],
      unlockAt: row.unlock_at,
      status: row.status as VaultItem["status"],
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    };
  }

  async resolveVaultItem(
    id: string,
    input: ResolveVaultItemInput
  ): Promise<VaultItem> {
    const userId = await this.getUserId();

    const { data, error } = await this.client
      .from("vault_items")
      .update({
        status: input.status,
        resolved_at: input.resolvedAt || new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve vault item "${id}": ${error.message}`);
    }

    const row = data as DbVaultItem;
    return {
      id: row.id,
      userId: row.user_id,
      itemName: row.item_name,
      priceMinor: Number(row.price_minor),
      triggerTag: row.trigger_tag as VaultItem["triggerTag"],
      unlockAt: row.unlock_at,
      status: row.status as VaultItem["status"],
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to fetch weekly nudge: ${error.message}`);
    }

    if (!data) return null;

    const row = data as DbWeeklyNudge;
    return {
      id: row.id,
      userId: row.user_id,
      weekKey: row.week_key,
      biasSnapshot: row.bias_snapshot as unknown as WeeklyNudge["biasSnapshot"],
      coachResponse: row.coach_response,
      createdAt: row.created_at,
    };
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
      throw new Error(`Failed to save weekly nudge: ${error.message}`);
    }

    const row = data as DbWeeklyNudge;
    return {
      id: row.id,
      userId: row.user_id,
      weekKey: row.week_key,
      biasSnapshot: row.bias_snapshot as unknown as WeeklyNudge["biasSnapshot"],
      coachResponse: row.coach_response,
      createdAt: row.created_at,
    };
  }

  // Demo reset is disallowed for authenticated users
  async resetDemo(): Promise<void> {
    throw new Error("Demo reset is only supported in Guest Sandbox mode.");
  }
}


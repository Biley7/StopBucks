"use client";

/**
 * StopBucks Repository Context Provider
 *
 * Implements the dual-mode architecture:
 * - Guest Sandbox: GuestSandboxRepository (sessionStorage)
 * - Authenticated: SupabaseRepository (Supabase PostgreSQL + RLS)
 *
 * Ensures:
 * - UI components and domain code interact purely via IStopBucksRepository.
 * - Guest mode must be explicitly activated.
 * - Never briefly flashes one user's data while switching modes.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { GuestSandboxRepository } from "./guest-sandbox.repository";
import type { IStopBucksRepository } from "./repository.interface";
import { SupabaseRepository } from "./supabase.repository";

type ActiveMode = "guest" | "authenticated" | "none";

interface RepositoryContextValue {
  repository: IStopBucksRepository;
  isGuest: boolean;
  isLoading: boolean;
  user: User | null;
  activeMode: ActiveMode;
  isSupabaseAvailable: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  resetDemo: () => Promise<void>;
}

const GUEST_FLAG_KEY = "stopbucks_explicit_guest_mode";

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const [activeMode, setActiveMode] = useState<ActiveMode>("none");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSupabaseAvailable = isSupabaseConfigured();

  // Lazy instantiate repositories
  const guestRepo = useMemo(() => new GuestSandboxRepository(), []);
  const supabaseClient = useMemo(() => createClient(), []);
  const supabaseRepo = useMemo(() => {
    return supabaseClient ? new SupabaseRepository(supabaseClient) : null;
  }, [supabaseClient]);

  // Synchronize authentication and guest states safely
  useEffect(() => {
    let isMounted = true;

    async function checkInitialMode() {
      // 1. Check if user explicitly activated Guest Sandbox
      const explicitGuest =
        typeof window !== "undefined" &&
        sessionStorage.getItem(GUEST_FLAG_KEY) === "true";

      if (explicitGuest) {
        if (isMounted) {
          setActiveMode("guest");
          setIsLoading(false);
        }
        return;
      }

      // 2. Check Supabase session if configured
      if (supabaseClient) {
        try {
          const {
            data: { user: currentUser },
          } = await supabaseClient.auth.getUser();

          if (isMounted) {
            if (currentUser) {
              setUser(currentUser);
              setActiveMode("authenticated");
            } else {
              setActiveMode("none");
            }
          }
        } catch {
          if (isMounted) setActiveMode("none");
        }
      } else {
        if (isMounted) setActiveMode("none");
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    checkInitialMode();

    // Listen to Supabase Auth state changes if available
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabaseClient) {
      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser(session.user);
          setActiveMode("authenticated");
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(GUEST_FLAG_KEY);
          }
        } else {
          setUser(null);
          const wasGuest =
            typeof window !== "undefined" &&
            sessionStorage.getItem(GUEST_FLAG_KEY) === "true";
          setActiveMode(wasGuest ? "guest" : "none");
        }
        setIsLoading(false);
      });
      authSubscription = subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [supabaseClient]);

  const enterGuestMode = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(GUEST_FLAG_KEY, "true");
    }
    setActiveMode("guest");
  }, []);

  const exitGuestMode = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GUEST_FLAG_KEY);
    }
    setActiveMode(user ? "authenticated" : "none");
  }, [user]);

  const resetDemo = useCallback(async () => {
    if (guestRepo) {
      await guestRepo.resetDemo();
    }
  }, [guestRepo]);

  // Selected repository instance based on current mode
  const repository: IStopBucksRepository = useMemo(() => {
    if (activeMode === "authenticated" && supabaseRepo) {
      return supabaseRepo;
    }
    // Default to guest repository for sandbox and unconfigured states
    return guestRepo;
  }, [activeMode, supabaseRepo, guestRepo]);

  const isGuest = activeMode === "guest" || repository.isGuest;

  const value = useMemo<RepositoryContextValue>(() => {
    return {
      repository,
      isGuest,
      isLoading,
      user,
      activeMode,
      isSupabaseAvailable,
      enterGuestMode,
      exitGuestMode,
      resetDemo,
    };
  }, [
    repository,
    isGuest,
    isLoading,
    user,
    activeMode,
    isSupabaseAvailable,
    enterGuestMode,
    exitGuestMode,
    resetDemo,
  ]);

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository(): RepositoryContextValue {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepository must be used within a RepositoryProvider");
  }
  return context;
}


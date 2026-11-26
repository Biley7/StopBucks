/**
 * StopBucks Dojo Sound Preference Mutation Helpers
 *
 * Preserves full DojoProgress state when toggling soundMuted and coordinates
 * optimistic TanStack Query cache updates with rollback on persistence failure.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { DojoProgress } from "@/domain/dojo-types";
import { queryKeys, type CacheIdentity } from "@/lib/query-keys";
import type { IStopBucksRepository } from "@/repositories/repository.interface";

export interface SoundMutationContext {
  previousProgress?: DojoProgress;
}

/**
 * Produces a complete cloned DojoProgress with only soundMuted and updatedAt changed.
 */
export function buildSoundToggledProgress(
  current: DojoProgress,
  nextMuted: boolean,
  nowIso: string = new Date().toISOString()
): DojoProgress {
  return {
    ...current,
    completedLevels: current.completedLevels.map((entry) => ({ ...entry })),
    unlockedBadges: [...current.unlockedBadges],
    soundMuted: nextMuted,
    updatedAt: nowIso,
  };
}

export function createDojoSoundMutationOptions({
  queryClient,
  repository,
  cacheIdentity,
  onSuccess,
  onError,
}: {
  queryClient: QueryClient;
  repository: IStopBucksRepository;
  cacheIdentity: CacheIdentity;
  onSuccess?: (saved: DojoProgress) => void;
  onError?: (error: unknown) => void;
}) {
  const queryKey = queryKeys.dojoProgress(cacheIdentity);

  return {
    mutationFn: (nextProgress: DojoProgress) =>
      repository.saveDojoProgress(nextProgress),
    onMutate: async (nextProgress: DojoProgress): Promise<SoundMutationContext> => {
      await queryClient.cancelQueries({ queryKey });
      const previousProgress = queryClient.getQueryData<DojoProgress>(queryKey);
      queryClient.setQueryData<DojoProgress>(queryKey, nextProgress);
      return { previousProgress };
    },
    onError: (
      error: unknown,
      _variables: DojoProgress,
      context: SoundMutationContext | undefined
    ) => {
      if (context?.previousProgress) {
        queryClient.setQueryData<DojoProgress>(queryKey, context.previousProgress);
      }
      onError?.(error);
    },
    onSuccess: (saved: DojoProgress) => {
      queryClient.setQueryData<DojoProgress>(queryKey, saved);
      onSuccess?.(saved);
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey });
    },
  };
}

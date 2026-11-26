/**
 * StopBucks Dojo Lesson Completion Mutation Helpers
 *
 * Persists completed DojoProgress via the repository and updates/invalidates
 * the identity-scoped Dojo progress TanStack Query cache.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { DojoProgress } from "@/domain/dojo-types";
import { queryKeys, type CacheIdentity } from "@/lib/query-keys";
import type { IStopBucksRepository } from "@/repositories/repository.interface";

export function createDojoCompletionMutationOptions({
  queryClient,
  repository,
  cacheIdentity,
  onError,
}: {
  queryClient: QueryClient;
  repository: IStopBucksRepository;
  cacheIdentity: CacheIdentity;
  onError?: (error: unknown) => void;
}) {
  const queryKey = queryKeys.dojoProgress(cacheIdentity);

  return {
    mutationFn: (nextProgress: DojoProgress) =>
      repository.saveDojoProgress(nextProgress),
    onSuccess: async (savedProgress: DojoProgress) => {
      queryClient.setQueryData<DojoProgress>(queryKey, savedProgress);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: unknown) => {
      onError?.(error);
    },
  };
}

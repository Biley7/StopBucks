"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getLevelStatus } from "@/domain/dojo-engine";
import type { DojoLevelId, DojoProgress } from "@/domain/dojo-types";
import {
  buildSoundToggledProgress,
  createDojoSoundMutationOptions,
} from "@/lib/dojo-sound-mutation";
import { createDojoCompletionMutationOptions } from "@/lib/dojo-progress-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useRepository } from "@/repositories/repository-provider";
import {
  DojoCitationModal,
  type DojoCitationTarget,
} from "@/components/dojo/dojo-citation-modal";
import { DojoHeader } from "@/components/dojo/dojo-header";
import { DojoLessonArena } from "@/components/dojo/dojo-lesson-arena";
import { DojoLevelBriefing } from "@/components/dojo/dojo-level-briefing";
import { DojoSideRail } from "@/components/dojo/dojo-side-rail";
import { DojoSkillMap } from "@/components/dojo/dojo-skill-map";
import { DojoTrophyDrawer } from "@/components/dojo/dojo-trophy-drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DojoPage() {
  const { repository, cacheIdentity, activeMode } = useRepository();
  const queryClient = useQueryClient();

  const [selectedLevelId, setSelectedLevelId] = useState<DojoLevelId | null>(null);
  const [activeLessonLevelId, setActiveLessonLevelId] =
    useState<DojoLevelId | null>(null);
  const [lessonAttemptNonce, setLessonAttemptNonce] = useState(0);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [citationTarget, setCitationTarget] = useState<DojoCitationTarget | null>(
    null
  );

  const progressQuery = useQuery({
    queryKey: queryKeys.dojoProgress(cacheIdentity),
    queryFn: () => repository.getDojoProgress(),
    enabled: activeMode !== "none",
  });

  // Live financial context for Beat 3 Personal Data Mirror
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(cacheIdentity),
    queryFn: () => repository.getProfile(),
    enabled: activeMode !== "none",
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(cacheIdentity),
    queryFn: () => repository.getTransactions(),
    enabled: activeMode !== "none",
  });

  const fixedCommitmentsQuery = useQuery({
    queryKey: queryKeys.fixedCommitments(cacheIdentity),
    queryFn: () => repository.getFixedCommitments(),
    enabled: activeMode !== "none",
  });

  const vaultItemsQuery = useQuery({
    queryKey: queryKeys.vaultItems(cacheIdentity),
    queryFn: () => repository.getVaultItems(),
    enabled: activeMode !== "none",
  });

  const soundMutationOptions = useMemo(
    () =>
      createDojoSoundMutationOptions({
        queryClient,
        repository,
        cacheIdentity,
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not save sound preference. Please try again."
          );
        },
      }),
    [queryClient, repository, cacheIdentity]
  );

  const soundMutation = useMutation(soundMutationOptions);

  const completionMutationOptions = useMemo(
    () =>
      createDojoCompletionMutationOptions({
        queryClient,
        repository,
        cacheIdentity,
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not save lesson completion. Please retry."
          );
        },
      }),
    [queryClient, repository, cacheIdentity]
  );

  const completionMutation = useMutation(completionMutationOptions);

  if (progressQuery.isLoading) {
    return <DojoSkeleton />;
  }

  if (progressQuery.isError || !progressQuery.data) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">
          We could not load StopBucks Dojo
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          Your training progress is intact. Retry loading your skill map.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-4 gap-1.5"
          onClick={() => progressQuery.refetch()}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    );
  }

  const progress = progressQuery.data;

  const handleToggleSound = () => {
    if (soundMutation.isPending) return;
    const nextProgress = buildSoundToggledProgress(
      progress,
      !progress.soundMuted
    );
    soundMutation.mutate(nextProgress);
  };

  const handleSelectLevel = (levelId: DojoLevelId) => {
    if (getLevelStatus(levelId, progress) === "locked") {
      return;
    }
    setSelectedLevelId(levelId);
  };

  const handleStartLesson = (levelId: DojoLevelId) => {
    if (getLevelStatus(levelId, progress) === "locked") {
      return;
    }
    setSelectedLevelId(null);
    setLessonAttemptNonce((prev) => prev + 1);
    setActiveLessonLevelId(levelId);
  };

  const handleStartNextLevel = (nextLevelId: DojoLevelId) => {
    const latestProgress =
      queryClient.getQueryData<DojoProgress>(
        queryKeys.dojoProgress(cacheIdentity)
      ) ?? progress;
    if (getLevelStatus(nextLevelId, latestProgress) === "locked") {
      return;
    }
    setLessonAttemptNonce((prev) => prev + 1);
    setActiveLessonLevelId(nextLevelId);
  };

  const isMirrorLoading =
    activeMode !== "none" &&
    (profileQuery.isPending ||
      transactionsQuery.isPending ||
      fixedCommitmentsQuery.isPending ||
      vaultItemsQuery.isPending);

  const isMirrorError =
    profileQuery.isError ||
    transactionsQuery.isError ||
    fixedCommitmentsQuery.isError ||
    vaultItemsQuery.isError;

  const handleRetryMirror = () => {
    if (profileQuery.isError) void profileQuery.refetch();
    if (transactionsQuery.isError) void transactionsQuery.refetch();
    if (fixedCommitmentsQuery.isError) void fixedCommitmentsQuery.refetch();
    if (vaultItemsQuery.isError) void vaultItemsQuery.refetch();
  };

  return (
    <div className="space-y-5">
      <DojoHeader
        progress={progress}
        onOpenTrophyCase={() => setTrophyOpen(true)}
        onOpenResearchLibrary={() => setCitationTarget({ mode: "library" })}
        onToggleSound={handleToggleSound}
        isSavingSound={soundMutation.isPending}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <DojoSkillMap progress={progress} onSelectLevel={handleSelectLevel} />

        <DojoSideRail
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onOpenTrophyCase={() => setTrophyOpen(true)}
          onOpenResearchLibrary={() => setCitationTarget({ mode: "library" })}
        />
      </div>

      <DojoLevelBriefing
        levelId={selectedLevelId}
        progress={progress}
        open={selectedLevelId !== null && citationTarget === null}
        onOpenChange={(open) => {
          if (!open) setSelectedLevelId(null);
        }}
        onStartLesson={handleStartLesson}
        onOpenCitation={(levelId) =>
          setCitationTarget({ mode: "level", levelId })
        }
      />

      <DojoTrophyDrawer
        progress={progress}
        open={trophyOpen}
        onOpenChange={setTrophyOpen}
      />

      <DojoCitationModal
        target={citationTarget}
        onClose={() => setCitationTarget(null)}
      />

      {activeLessonLevelId !== null && (
        <DojoLessonArena
          key={`${activeLessonLevelId}-${lessonAttemptNonce}`}
          levelId={activeLessonLevelId}
          progress={progress}
          profile={profileQuery.data ?? null}
          transactions={transactionsQuery.data ?? []}
          fixedCommitments={fixedCommitmentsQuery.data ?? []}
          vaultItems={vaultItemsQuery.data ?? []}
          isMirrorLoading={isMirrorLoading}
          isMirrorError={isMirrorError}
          onRetryMirror={handleRetryMirror}
          onToggleMute={handleToggleSound}
          isSavingMute={soundMutation.isPending}
          onCompleteProgress={(nextProgress) =>
            completionMutation.mutateAsync(nextProgress)
          }
          onExitToMap={() => setActiveLessonLevelId(null)}
          onStartNextLevel={handleStartNextLevel}
        />
      )}
    </div>
  );
}

function DojoSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading StopBucks Dojo">
      <div className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="h-[520px] animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="h-48 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        </div>
      </div>
    </div>
  );
}

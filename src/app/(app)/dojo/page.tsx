"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getLevelStatus } from "@/domain/dojo-engine";
import type { DojoLevelId } from "@/domain/dojo-types";
import {
  buildSoundToggledProgress,
  createDojoSoundMutationOptions,
} from "@/lib/dojo-sound-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useRepository } from "@/repositories/repository-provider";
import {
  DojoCitationModal,
  type DojoCitationTarget,
} from "@/components/dojo/dojo-citation-modal";
import { DojoHeader } from "@/components/dojo/dojo-header";
import { DojoLessonHandoffDialog } from "@/components/dojo/dojo-lesson-handoff-dialog";
import { DojoLevelBriefing } from "@/components/dojo/dojo-level-briefing";
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
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [citationTarget, setCitationTarget] = useState<DojoCitationTarget | null>(
    null
  );

  const progressQuery = useQuery({
    queryKey: queryKeys.dojoProgress(cacheIdentity),
    queryFn: () => repository.getDojoProgress(),
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

  // Explicit Phase 5C lesson-launch handoff boundary
  const handleStartLesson = (levelId: DojoLevelId) => {
    if (getLevelStatus(levelId, progress) === "locked") {
      return;
    }
    setSelectedLevelId(null);
    setActiveLessonLevelId(levelId);
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

      <DojoSkillMap progress={progress} onSelectLevel={handleSelectLevel} />

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

      <DojoLessonHandoffDialog
        levelId={activeLessonLevelId}
        onClose={() => setActiveLessonLevelId(null)}
      />
    </div>
  );
}

function DojoSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading StopBucks Dojo">
      <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="h-[520px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

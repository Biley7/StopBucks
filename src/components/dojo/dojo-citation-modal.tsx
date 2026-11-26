"use client";

import React from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { getDojoLevel, getDojoWorld } from "@/domain/dojo-curriculum";
import type { DojoCitation, DojoLevelId } from "@/domain/dojo-types";
import {
  getGroupedDojoResearchLibrary,
  getUniqueDojoCitations,
} from "@/lib/dojo-citations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DojoCitationTarget =
  | { mode: "level"; levelId: DojoLevelId }
  | { mode: "library" };

interface DojoCitationModalProps {
  target: DojoCitationTarget | null;
  onClose: () => void;
}

function CitationCard({
  citation,
  roleLabel,
  levelTags,
}: {
  citation: DojoCitation;
  roleLabel?: string;
  levelTags?: string[];
}) {
  return (
    <article className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default" className="text-[11px] font-bold">
          {citation.year}
        </Badge>
        {roleLabel && (
          <Badge variant="secondary" className="text-[11px] font-semibold">
            {roleLabel}
          </Badge>
        )}
        {levelTags?.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-[10px] font-semibold text-slate-600"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-bold leading-snug text-slate-900">
          {citation.title}
        </h4>
        <p className="mt-1 text-xs font-semibold text-slate-700">
          {citation.authors}
        </p>
        {citation.journal && (
          <p className="mt-0.5 text-xs italic text-slate-500">
            {citation.journal}
          </p>
        )}
      </div>

      {citation.sampleSummary && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Sample &amp; Design: </span>
          {citation.sampleSummary}
        </div>
      )}

      {citation.keyFinding && (
        <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-sky-900">Key Empirical Finding: </span>
          {citation.keyFinding}
        </div>
      )}
    </article>
  );
}

export function DojoCitationModal({ target, onClose }: DojoCitationModalProps) {
  const uniqueStudies = React.useMemo(() => getUniqueDojoCitations(), []);
  const groupedLibrary = React.useMemo(
    () => getGroupedDojoResearchLibrary(),
    []
  );

  if (!target) return null;

  const isLevelMode = target.mode === "level";
  const level = isLevelMode ? getDojoLevel(target.levelId) : null;
  const world = level ? getDojoWorld(level.worldId) : null;

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-xl p-5 sm:p-6">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 pr-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              {isLevelMode ? (
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {isLevelMode && level
                ? `Level ${level.id} Research Basis`
                : "StopBucks Dojo Research Library"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 sm:text-sm">
            {isLevelMode && level && world
              ? `World ${world.worldNumber}: ${world.title} — ${level.title}`
              : `${uniqueStudies.length} verified peer-reviewed & foundational studies from the StopBucks Dojo research curriculum.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 pt-1">
          {isLevelMode && level ? (
            <div className="space-y-3">
              <CitationCard
                citation={level.citation}
                roleLabel="Primary Study"
              />
              {level.secondaryCitation && (
                <CitationCard
                  citation={level.secondaryCitation}
                  roleLabel="Supporting Study"
                />
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedLibrary.map((group) => (
                <section
                  key={group.worldId}
                  aria-labelledby={`library-world-${group.worldNumber}`}
                  className="space-y-2.5"
                >
                  <div className="border-b border-slate-200 pb-1.5">
                    <h3
                      id={`library-world-${group.worldNumber}`}
                      className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      World {group.worldNumber} · {group.worldTitle}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {group.worldSubtitle}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {group.studies.map((study) => (
                      <CitationCard
                        key={study.id}
                        citation={study.citation}
                        levelTags={study.referencedBy.map(
                          (ref) =>
                            `Level ${ref.levelId} (${
                              ref.role === "primary" ? "Primary" : "Supporting"
                            })`
                        )}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

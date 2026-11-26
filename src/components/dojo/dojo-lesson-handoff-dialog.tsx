"use client";

import React from "react";
import { ArrowLeft, Swords } from "lucide-react";
import { getDojoLevel, getDojoWorld } from "@/domain/dojo-curriculum";
import type { DojoLevelId } from "@/domain/dojo-types";
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

interface DojoLessonHandoffDialogProps {
  levelId: DojoLevelId | null;
  onClose: () => void;
}

export function DojoLessonHandoffDialog({
  levelId,
  onClose,
}: DojoLessonHandoffDialogProps) {
  if (levelId === null) return null;

  const level = getDojoLevel(levelId);
  const world = getDojoWorld(level.worldId);

  return (
    <Dialog
      open={levelId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl p-5 sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <Badge variant="default" className="gap-1 text-[11px] font-bold">
              <Swords className="h-3 w-3" aria-hidden="true" />
              Phase 5C Boundary
            </Badge>
            <Badge variant="outline" className="text-[11px] font-semibold">
              World {world.worldNumber} · Level {level.id}
            </Badge>
          </div>

          <DialogTitle className="text-lg font-bold text-slate-900">
            Training Room Ready — Phase 5C
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Selected drill:{" "}
            <strong className="text-slate-900">
              Level {level.id} — {level.title}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
          The interactive training experience for{" "}
          <strong className="text-slate-900">{level.title}</strong> (including
          live behavioral simulations, personal data mirror, and synthesized
          sound feedback) is coming in <strong>Phase 5C</strong>.
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            className="w-full gap-2 border-b-[3px] border-b-sky-800 bg-sky-600 font-semibold text-white hover:bg-sky-500 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Map</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

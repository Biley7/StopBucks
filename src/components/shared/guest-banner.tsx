"use client";

import React, { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { Button } from "@/components/ui/button";

export function GuestBanner() {
  const { isGuest, resetDemo } = useRepository();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);

  if (!isGuest) return null;

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetDemo();
      await queryClient.invalidateQueries();
      toast.success("Guest Sandbox restored to pristine demo dataset.");
    } catch (err) {
      toast.error("Failed to reset demo dataset.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-3.5 py-1.5 text-xs text-amber-950 sm:px-6 sm:py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="truncate">
            <strong>Guest Sandbox:</strong>{" "}
            <span className="hidden sm:inline">
              Exploring with preloaded 30-day student financial data.
            </span>
            <span className="sm:hidden">Preloaded 30-day demo data</span>
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          disabled={isResetting}
          className="h-7 shrink-0 border-amber-300 bg-white px-2.5 text-[11px] font-medium text-amber-950 hover:bg-amber-100/60 focus-visible:ring-amber-500 sm:text-xs"
        >
          <RotateCcw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} aria-hidden="true" />
          {isResetting ? "Resetting..." : "Reset Demo"}
        </Button>
      </div>
    </div>
  );
}


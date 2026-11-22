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
    <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Guest Sandbox Mode:</strong> Exploring with preloaded 30-day student financial data.
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          disabled={isResetting}
          className="h-7 border-amber-300 bg-white px-2.5 text-xs text-amber-900 hover:bg-amber-100/50"
        >
          <RotateCcw className={`mr-1.5 h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
          {isResetting ? "Resetting..." : "Reset Demo"}
        </Button>
      </div>
    </div>
  );
}


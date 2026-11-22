"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("StopBucks Workspace Error Boundary caught:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Workspace Error</h2>
        <p className="mt-2 text-xs text-slate-500">
          We encountered an issue loading this workspace module. Your financial data is intact.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => reset()} size="sm" variant="default" className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Reload Module
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/runway">Back to Runway</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}


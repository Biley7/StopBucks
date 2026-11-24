"use client";

import Link from "next/link";
import { useRepository } from "@/repositories/repository-provider";
import { Button } from "@/components/ui/button";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { activeMode, isLoading, enterGuestMode } = useRepository();
  if (isLoading) return <div className="min-h-screen bg-slate-50" aria-busy="true" />;
  if (activeMode !== "none") return <>{children}</>;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Choose how to continue</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to see your account, or explore the separate guest demo.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button asChild variant="outline"><Link href="/">Sign In</Link></Button>
          <Button onClick={enterGuestMode}>Launch Guest Demo</Button>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRepository } from "@/repositories/repository-provider";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { activeMode, isLoading, enterGuestMode } = useRepository();
  if (isLoading) return <div className="min-h-screen bg-[#F7F8FA]" aria-busy="true" />;
  if (activeMode !== "none") return <>{children}</>;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-900/[0.08] bg-white p-7 text-center">
        <BrandMark size="lg" showWordmark={false} className="mx-auto mb-4" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Choose how to continue</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to see your account, or explore the separate guest demo.</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild variant="outline"><Link href="/">Sign In</Link></Button>
          <Button onClick={enterGuestMode}>Try Instant Demo (Guest)</Button>
        </div>
      </section>
    </main>
  );
}

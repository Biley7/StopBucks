"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Hourglass,
  Sparkles,
  Swords,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRepository } from "@/repositories/repository-provider";
import { createClient } from "@/lib/supabase/client";

export default function LandingPage() {
  const router = useRouter();
  const { enterGuestMode, isSupabaseAvailable } = useRepository();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLaunchGuest = () => {
    enterGuestMode();
    router.push("/runway");
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseAvailable) {
      setErrorMessage(
        "Supabase credentials are not configured in this environment. Please explore using the Guest Demo."
      );
      setAuthStatus("error");
      return;
    }

    const client = createClient();
    if (!client) {
      setErrorMessage("Authentication client unavailable.");
      setAuthStatus("error");
      return;
    }

    try {
      setAuthStatus("loading");
      setErrorMessage("");
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setAuthStatus("error");
      } else {
        setAuthStatus("sent");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send magic link");
      setAuthStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-sm font-bold text-white shadow-xs sm:h-10 sm:w-10">
              SB
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                StopBucks
              </span>
              <span className="hidden rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 sm:inline-block">
                Behavioral Finance
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthDialogOpen(true)}
              className="border-slate-300 text-slate-700 hover:text-slate-900"
            >
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Sign In / Start</span>
            </Button>
            <Button
              size="sm"
              onClick={handleLaunchGuest}
              className="bg-sky-700 text-white hover:bg-sky-800"
            >
              <span className="sm:hidden">Try Demo</span>
              <span className="hidden sm:inline">Try Instant Demo</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero + Product Pillars */}
      <main className="flex-1">
        <section className="px-4 pt-8 pb-14 sm:px-6 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-900 sm:mb-5">
              <Sparkles className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
              <span>For College &amp; University Students</span>
            </div>

            <h1 className="mx-auto max-w-3xl text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
              StopBucks —{" "}
              <span className="text-sky-700">
                Take control before your money disappears.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
              Expense trackers only report yesterday&apos;s damage. StopBucks gives you a
              live{" "}
              <strong className="font-semibold text-slate-800">
                Daily Safe-to-Spend Runway
              </strong>
              , pauses impulse buys in a{" "}
              <strong className="font-semibold text-slate-800">
                48h Cool-Off Vault
              </strong>
              , and builds real reflexes in a{" "}
              <strong className="font-semibold text-slate-800">
                12-Study Behavioral Dojo
              </strong>
              .
            </p>

            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={handleLaunchGuest}
                className="h-12 w-full gap-2 border-b-[3px] border-b-sky-950 bg-sky-700 px-7 text-base font-semibold text-white shadow-sm hover:bg-sky-800 sm:w-auto"
              >
                <span>Try Instant Demo (Guest)</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setAuthDialogOpen(true)}
                className="h-12 w-full border-slate-300 bg-white px-7 text-base font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
              >
                Sign In / Start
              </Button>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Preloaded 30-day student financial dataset · Instant access, no sign-up required.
            </p>
          </div>

          {/* Three Core Product Pillars */}
          <div className="mx-auto mt-12 max-w-5xl sm:mt-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              {/* Pillar 1: Daily Safe-to-Spend Runway */}
              <Card className="flex flex-col border-slate-200/80 bg-white transition-shadow hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle as="h2" className="text-base font-bold sm:text-lg">
                    Daily Safe-to-Spend Runway
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Know exactly what is safe to spend today without starving at month-end.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-relaxed text-slate-600">
                  Reserves fixed bills and ring-fences self-investment first, then divides
                  your remaining consumption pool across the days left in the month.
                </CardContent>
              </Card>

              {/* Pillar 2: 48h Cool-Off Vault */}
              <Card className="flex flex-col border-slate-200/80 bg-white transition-shadow hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <Hourglass className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle as="h2" className="text-base font-bold sm:text-lg">
                    48h Cool-Off Vault
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Insert intentional friction before dopamine drives a regretful tap.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-relaxed text-slate-600">
                  Park impulse wants for 48 hours, preview their runway impact in work hours
                  and 4-year value, and rescue your cash once urgency fades.
                </CardContent>
              </Card>

              {/* Pillar 3: 12-Study Behavioral Dojo */}
              <Card className="flex flex-col border-slate-200/80 bg-white transition-shadow hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <Swords className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle as="h2" className="text-base font-bold sm:text-lg">
                    12-Study Behavioral Dojo
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Interactive 3-world drills grounded in 12 peer-reviewed behavioral studies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-relaxed text-slate-600">
                  Predict empirical findings, train against frictionless spending traps, and
                  see every concept mirrored against your own live wallet ledger.
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Supporting Philosophy & Bias Radar Strip */}
          <div className="mx-auto mt-10 max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:mt-12 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-700">
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Zero-Guilt Architecture · Built-In Bias Radar</span>
                </div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  &ldquo;Pause mindless impulse. Protect self-investment.&rdquo;
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  Books, courses, and fitness never shrink your daily runway. Meanwhile,
                  deterministic Bias Radar detectors spot Late-Night Drift, Cashless
                  Numbness, Payday Burn, and Social FOMO without judgment.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLaunchGuest}
                className="shrink-0 gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-50"
              >
                <span>Explore Live Demo</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-600 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} StopBucks. Built for college &amp; university students.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLaunchGuest}
              className="rounded-sm font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              Try Instant Demo (Guest)
            </button>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <button
              type="button"
              onClick={() => setAuthDialogOpen(true)}
              className="rounded-sm font-medium text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              Sign In / Start
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Sign In to StopBucks</DialogTitle>
            <DialogDescription>
              Enter your email to receive a secure sign-in magic link.
            </DialogDescription>
          </DialogHeader>

          {!isSupabaseAvailable ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Supabase Configuration Notice</p>
                    <p>
                      Supabase authentication environment credentials (<code>NEXT_PUBLIC_SUPABASE_URL</code>)
                      are currently not set.
                    </p>
                    <p>
                      You can experience all features, calculations, and tests right now in the{" "}
                      <strong>Guest Sandbox Demo</strong>!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => {
                  setAuthDialogOpen(false);
                  handleLaunchGuest();
                }}
              >
                Launch Guest Sandbox Instead
              </Button>
            </div>
          ) : authStatus === "sent" ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-600">
                We sent a magic sign-in link to <strong>{email}</strong>. Click the link in your email to log in.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAuthStatus("idle");
                  setAuthDialogOpen(false);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="auth-email">Student Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authStatus === "loading"}
                />
              </div>

              {authStatus === "error" && errorMessage && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={authStatus === "loading" || !email}
                className="w-full bg-sky-600 text-white hover:bg-sky-700"
              >
                {authStatus === "loading" ? "Sending link..." : "Send Magic Link"}
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthDialogOpen(false);
                    handleLaunchGuest();
                  }}
                  className="text-xs text-sky-600 hover:underline cursor-pointer"
                >
                  Or continue instantly with Guest Demo →
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Hourglass,
  Lock,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 font-bold text-white shadow-sm">
              SB
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                StopBucks
              </span>
              <span className="ml-2 hidden rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 sm:inline-block">
                Behavioral Finance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthDialogOpen(true)}
              className="text-slate-700"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={handleLaunchGuest}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Try Guest Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:pt-24 lg:pb-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-4 py-1.5 text-xs font-medium text-sky-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>Designed specifically for college & university students</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-tight">
              Expense trackers tell you what you spent.{" "}
              <span className="text-sky-600">
                Behavioral finance changes why you spend.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              StopBucks removes the guilt and replaces it with psychology. Discover your
              dynamic Daily Runway, protect your intentional self-investment, and pause
              impulse purchases in the 48-Hour Vault.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={handleLaunchGuest}
                className="w-full sm:w-auto gap-2 bg-sky-600 text-white hover:bg-sky-700 shadow-md text-base px-8 h-12"
              >
                <span>Launch Guest Sandbox</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setAuthDialogOpen(true)}
                className="w-full sm:w-auto text-base px-8 h-12 border-slate-300"
              >
                Sign In with Email
              </Button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Guest Sandbox preloads 30 days of student data. No sign-up or credit card needed.
            </p>
          </div>

          {/* Core Pillars */}
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Daily Runway */}
              <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Dynamic Daily Runway</CardTitle>
                  <CardDescription>
                    Know exactly what you can safely spend today without starving at month-end.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Separates your intentional self-investment capital from consumption burn
                  and recalculates your allowance each morning based on calendar days remaining.
                </CardContent>
              </Card>

              {/* Cool-Off Vault */}
              <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Hourglass className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">48-Hour Cool-Off Vault</CardTitle>
                  <CardDescription>
                    Friction before impulse. Pause dopamine cravings before your balance drops.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Lock impulsive purchases for 48 hours. When dopamine settles, students rescue
                  over 70% of potential regrets and protect their hard-earned allowance.
                </CardContent>
              </Card>

              {/* Behavioral Bias Radar */}
              <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Compass className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Behavioral Bias Radar</CardTitle>
                  <CardDescription>
                    Deterministic detection of the four silent student spending traps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Identifies Late-Night Drift (10 PM–4 AM), Cashless Numbness (small digital taps),
                  Payday Windfall Burn, and Social FOMO without judgment or guilt.
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Philosophy Banner */}
          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center sm:p-10">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              "Pause mindless impulse. Protect self-investment."
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Unlike traditional budgeting tools that scold you for living, StopBucks treats
              books, certifications, and gym passes as protected investments. Only lifestyle burn
              squeezes your daily runway.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} StopBucks. Built for college & university students.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLaunchGuest}
              className="text-sky-600 hover:underline cursor-pointer"
            >
              Guest Sandbox
            </button>
            <span>•</span>
            <span className="text-slate-400">Zero-Guilt Architecture</span>
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


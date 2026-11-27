"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Swords } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { PainOfPayingToggle } from "./pain-of-paying-toggle";
import { NAV_ITEMS } from "./app-sidebar";

export function isDojoPathname(pathname: string | null | undefined): boolean {
  if (typeof pathname !== "string") return false;
  return pathname === "/dojo" || pathname.startsWith("/dojo/");
}

export function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isGuest, exitGuestMode } = useRepository();
  const isDojoRoute = isDojoPathname(pathname);
  const currentNav = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const endSession = async () => {
    queryClient.clear();
    if (isGuest) {
      exitGuestMode();
    } else {
      await createClient()?.auth.signOut();
    }
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white/95 px-3.5 backdrop-blur-md sm:px-6">
      {/* Mobile Brand / Module Context */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <Link
          href="/runway"
          title="StopBucks — Go to Daily Runway"
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden"
        >
          <BrandMark size="sm" showWordmark={false} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
            <span className="sm:hidden">{currentNav?.shortName || "StopBucks"}</span>
            <span className="hidden sm:inline">{currentNav?.name || "StopBucks"}</span>
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {currentNav?.description || "Behavioral Finance Engine"}
          </p>
        </div>
      </div>

      {/* Route-Aware Right Controls: Dojo Mode pill on /dojo, Pain-of-Paying Switcher elsewhere */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {isDojoRoute ? (
          <div
            role="status"
            aria-label="Dojo Mode active — behavioral finance training hub"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-white shadow-2xs"
          >
            <Swords className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="whitespace-nowrap">Dojo Mode</span>
          </div>
        ) : (
          <PainOfPayingToggle />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={endSession}
          className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 md:hidden"
          title={isGuest ? "Exit Sandbox" : "Sign Out"}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[11px]">{isGuest ? "Exit" : "Sign Out"}</span>
        </Button>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-slate-200/90 bg-white/95 px-1.5 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.12)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              isActive
                ? "bg-sky-50/90 text-sky-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 h-0.5 w-6 rounded-full bg-sky-600"
              />
            )}
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap leading-none">{item.shortName}</span>
          </Link>
        );
      })}
    </nav>
  );
}


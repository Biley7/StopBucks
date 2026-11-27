"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Hourglass,
  PlusCircle,
  Sliders,
  Swords,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepository } from "@/repositories/repository-provider";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

export const NAV_ITEMS = [
  {
    name: "Daily Runway",
    shortName: "Runway",
    href: "/runway",
    icon: TrendingUp,
    description: "Safe spending allowance",
  },
  {
    name: "Quick Log",
    shortName: "Log",
    href: "/log",
    icon: PlusCircle,
    description: "Capture triggers fast",
  },
  {
    name: "Bias Radar",
    shortName: "Radar",
    href: "/radar",
    icon: Compass,
    description: "Behavioral bias analysis",
  },
  {
    name: "Cool-Off Vault",
    shortName: "Vault",
    href: "/vault",
    icon: Hourglass,
    description: "48-hour impulse lock",
  },
  {
    name: "Behavioral Dojo",
    shortName: "Dojo",
    href: "/dojo",
    icon: Swords,
    description: "3-world behavioral finance mastery",
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isGuest, user, exitGuestMode } = useRepository();

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
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-slate-200/90 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 px-5">
        <Link
          href="/runway"
          className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <BrandMark size="md" showWordmark subtitle="Behavioral Finance" />
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
        <nav aria-label="Workspace navigation" className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Core Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                  isActive
                    ? "bg-sky-50 text-sky-800 font-semibold shadow-2xs ring-1 ring-sky-200/70"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-sky-600" : "text-slate-500"
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Profile settings */}
        <div className="space-y-3 pt-4 border-t border-slate-200/80">
          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Sliders className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Budget &amp; Rate Baseline</span>
          </Link>

          <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200/80">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="font-medium text-slate-800 truncate">
                {isGuest ? "Guest Sandbox User" : user?.email || "Authenticated Student"}
              </span>
            </div>
            <div className="mt-1.5">
              <span className="inline-block rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {isGuest ? "Session Sandbox" : "Supabase PostgreSQL"}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={endSession}>
            {isGuest ? "Exit Sandbox" : "Sign Out"}
          </Button>
        </div>
      </div>
    </aside>
  );
}


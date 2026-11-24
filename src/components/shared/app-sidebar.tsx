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
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepository } from "@/repositories/repository-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export const NAV_ITEMS = [
  {
    name: "Daily Runway",
    href: "/runway",
    icon: TrendingUp,
    description: "Safe spending allowance",
  },
  {
    name: "Quick Log",
    href: "/log",
    icon: PlusCircle,
    description: "Capture triggers fast",
  },
  {
    name: "Bias Radar",
    href: "/radar",
    icon: Compass,
    description: "Behavioral bias analysis",
  },
  {
    name: "Cool-Off Vault",
    href: "/vault",
    icon: Hourglass,
    description: "48-hour impulse lock",
  },
];

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
    <aside className="hidden md:flex md:w-64 md:flex-col md:inset-y-0 border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <Link href="/runway" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 font-bold text-white shadow-sm">
            SB
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight">StopBucks</span>
            <span className="block text-[10px] uppercase font-semibold text-sky-600 tracking-wider">
              Behavioral Finance
            </span>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <nav className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Core Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sky-50 text-sky-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-sky-600" : "text-slate-400"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Profile settings */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Sliders className="h-4 w-4 text-slate-400" />
            <span>Budget & Rate Baseline</span>
          </Link>

          <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200/60">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-slate-700 truncate">
                {isGuest ? "Guest Sandbox User" : user?.email || "Authenticated Student"}
              </span>
            </div>
            <div className="mt-1">
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


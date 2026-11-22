"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PainOfPayingToggle } from "./pain-of-paying-toggle";
import { NAV_ITEMS } from "./app-sidebar";

export function AppTopbar() {
  const pathname = usePathname();
  const currentNav = NAV_ITEMS.find((item) => pathname.startsWith(item.href));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile Brand / Page Title */}
      <div className="flex items-center gap-3">
        <Link href="/runway" className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 font-bold text-white text-xs shadow-xs">
            SB
          </div>
        </Link>
        <div>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg">
            {currentNav?.name || "StopBucks"}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            {currentNav?.description || "Behavioral Finance Engine"}
          </p>
        </div>
      </div>

      {/* Global Pain-of-Paying Toggle */}
      <div className="flex items-center gap-3">
        <PainOfPayingToggle />
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 md:hidden shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? "text-sky-600 font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}


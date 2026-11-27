import React from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar, MobileBottomNav } from "@/components/shared/app-topbar";
import { GuestBanner } from "@/components/shared/guest-banner";
import { AccessGate } from "@/components/shared/access-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccessGate>
      <div className="flex min-h-dvh flex-col overflow-x-clip bg-[#F7F8FA] md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <AppSidebar />

        {/* Right Content Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact Guest Sandbox Banner with working Reset Demo */}
          <GuestBanner />

          {/* Top Bar with Pain-of-Paying Switcher */}
          <AppTopbar />

          {/* Page Content Viewport */}
          <main className="min-w-0 flex-1 bg-[#F7F8FA] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-10">
            <div className="mx-auto max-w-6xl min-w-0">{children}</div>
          </main>
        </div>

        {/* Mobile Fixed Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </AccessGate>
  );
}


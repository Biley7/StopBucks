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
      <div className="flex min-h-dvh flex-col bg-slate-50 md:h-dvh md:overflow-hidden">
        {/* Compact Guest Sandbox Banner with working Reset Demo */}
        <GuestBanner />

        <div className="flex min-h-0 flex-1">
          {/* Desktop Sidebar Navigation */}
          <AppSidebar />

          {/* Main Content Area */}
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip md:overflow-hidden">
            {/* Top Bar with Pain-of-Paying Switcher */}
            <AppTopbar />

            {/* Page Content Viewport */}
            <main className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 md:min-h-0 md:overflow-y-auto md:pb-10">
              <div className="mx-auto max-w-6xl min-w-0">{children}</div>
            </main>
          </div>
        </div>

        {/* Mobile Fixed Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </AccessGate>
  );
}


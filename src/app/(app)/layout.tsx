import React from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar, MobileBottomNav } from "@/components/shared/app-topbar";
import { GuestBanner } from "@/components/shared/guest-banner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Subtle Guest Sandbox Banner with working Reset Demo */}
      <GuestBanner />

      <div className="flex flex-1">
        {/* Desktop Sidebar Navigation */}
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar with Pain-of-Paying Switcher */}
          <AppTopbar />

          {/* Page Content Viewport */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}


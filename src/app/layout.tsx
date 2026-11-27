import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "StopBucks — Behavioral Finance for Students",
  description:
    "Expense trackers tell you what you spent. Behavioral finance changes why you spend. Pause mindless impulse. Protect self-investment.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/stopbucks-emblem.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F8FA] text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RepositoryProvider } from "@/repositories/repository-provider";
import { DisplayPreferenceProvider } from "@/lib/display-preference-context";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // Ensure a stable QueryClient instance across client renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>
        <DisplayPreferenceProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </DisplayPreferenceProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
}


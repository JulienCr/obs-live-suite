"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds default
            gcTime: 10 * 60 * 1000, // 10 minutes cache
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

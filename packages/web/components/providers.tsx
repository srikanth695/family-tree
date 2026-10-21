"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { FeedbackProvider } from "@/components/feedback-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}

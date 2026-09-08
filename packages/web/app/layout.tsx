import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers"

export const metadata: Metadata = {
  title: "Family Tree App",
  description: "Collaboratively document your genealogy",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

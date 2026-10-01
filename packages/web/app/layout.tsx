import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers"

export const metadata: Metadata = {
  title: "Family Tree App",
  description: "Collaboratively document your genealogy",
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('family-tree-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-stone-200 text-stone-900 antialiased dark:bg-black dark:text-stone-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

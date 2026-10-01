"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { applyTheme, readStoredTheme, resolvedTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme"

type ThemeContextValue = {
  preference: ThemePreference
  theme: "light" | "dark"
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system")
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const stored = readStoredTheme()
    setPreferenceState(stored)
    setTheme(resolvedTheme(stored))
    applyTheme(stored)
  }, [])

  useEffect(() => {
    if (preference !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      setTheme(resolvedTheme("system"))
      applyTheme("system")
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    setTheme(resolvedTheme(next))
    applyTheme(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark")
  }, [setPreference, theme])

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}

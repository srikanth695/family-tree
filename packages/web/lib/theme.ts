export const THEME_STORAGE_KEY = "family-tree-theme"

export type ThemePreference = "light" | "dark" | "system"

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function resolvedTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") return
  const dark = resolvedTheme(preference) === "dark"
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system"
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

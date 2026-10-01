import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Capitalize the first letter of each whitespace-separated word. */
export function titleCaseWords(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word))
    .join(" ")
}

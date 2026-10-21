import React from "react"
import { cn } from "@/lib/utils"

export type LifeStage = "baby" | "child" | "teen" | "adult" | "senior"

export function lifeStage(age: number | null): LifeStage {
  if (age === null) return "adult"
  if (age < 3) return "baby"
  if (age < 13) return "child"
  if (age < 20) return "teen"
  if (age < 60) return "adult"
  return "senior"
}

/** Whole years between birth and death (or `now`), or null when the birth date is unknown. */
export function ageInYears(
  person: { birth_date?: string | Date | null; death_date?: string | Date | null },
  now: Date = new Date(),
): number | null {
  if (!person.birth_date) return null
  const born = new Date(person.birth_date)
  const end = person.death_date ? new Date(person.death_date) : now
  if (Number.isNaN(born.getTime()) || Number.isNaN(end.getTime())) return null
  let age = end.getUTCFullYear() - born.getUTCFullYear()
  if (
    end.getUTCMonth() < born.getUTCMonth() ||
    (end.getUTCMonth() === born.getUTCMonth() && end.getUTCDate() < born.getUTCDate())
  ) {
    age -= 1
  }
  return age < 0 ? null : age
}

const BACKGROUNDS = {
  female: "bg-rose-100 dark:bg-rose-950",
  male: "bg-sky-100 dark:bg-sky-950",
  other: "bg-stone-200 dark:bg-stone-700",
} as const

const SKIN = "#e8b98f"

/**
 * Illustrated placeholder for people without a photo. Proportions, hair and accessories change
 * with the life stage so a toddler, a teenager and a grandparent are easy to tell apart.
 */
export function AgeAvatar({
  age,
  gender,
  className,
}: {
  age: number | null
  gender?: string | null
  className?: string
}) {
  const stage = lifeStage(age)
  const female = gender === "female"
  const hair = stage === "senior" ? "#d6d3d1" : stage === "baby" ? "#a8895f" : female ? "#5b3a29" : "#3b2a20"
  const shirt = female ? "#e11d48" : gender === "male" ? "#0284c7" : "#78716c"
  const small = stage === "baby" || stage === "child"
  // Younger people sit lower in the frame with a larger head relative to the body.
  const headR = stage === "baby" ? 10 : stage === "child" ? 9 : 8
  const headY = stage === "baby" ? 24 : stage === "child" ? 23 : 20
  const shoulderTop = small ? 36 : 33
  const longHair = female && stage !== "baby" && stage !== "child" ? true : female && stage === "child"

  return (
    <svg
      viewBox="0 0 44 44"
      aria-hidden="true"
      className={cn(
        "h-11 w-11 shrink-0 overflow-hidden rounded-full",
        BACKGROUNDS[female ? "female" : gender === "male" ? "male" : "other"],
        className,
      )}
    >
      {longHair && <rect x={headR === 8 ? 12 : 13} y={headY - 2} width={headR === 8 ? 20 : 18} height={16} rx={6} fill={hair} />}
      <path d={`M6 44 C6 ${shoulderTop} 14 ${shoulderTop} 22 ${shoulderTop} C30 ${shoulderTop} 38 ${shoulderTop} 38 44 Z`} fill={shirt} />
      <rect x="19" y={headY + headR - 2} width="6" height="6" fill={SKIN} />
      <circle cx="22" cy={headY} r={headR} fill={SKIN} />
      {stage === "baby" ? (
        <path d={`M20 ${headY - headR + 1} q2 -4 4 0`} stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <path
          d={`M${22 - headR} ${headY} a${headR} ${headR} 0 0 1 ${headR * 2} 0 q-${headR} -${stage === "teen" || stage === "adult" ? 4 : 3} -${headR * 2} 0`}
          fill={hair}
        />
      )}
      <circle cx={22 - headR / 2.6} cy={headY + 1} r="1" fill="#1c1917" />
      <circle cx={22 + headR / 2.6} cy={headY + 1} r="1" fill="#1c1917" />
      <path
        d={`M${22 - 2.5} ${headY + headR / 2 + 1.5} q2.5 2 5 0`}
        stroke="#7c2d12"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      {stage === "senior" && (
        <g fill="none" stroke="#44403c" strokeWidth="0.9">
          <circle cx={22 - 3.4} cy={headY + 1} r="2.4" />
          <circle cx={22 + 3.4} cy={headY + 1} r="2.4" />
          <path d={`M${22 - 1} ${headY + 1} h2`} />
        </g>
      )}
      {stage === "adult" && !female && <path d={`M${22 - 5} ${headY + 5} q5 3 10 0`} stroke={hair} strokeWidth="0.8" fill="none" opacity="0.5" />}
    </svg>
  )
}

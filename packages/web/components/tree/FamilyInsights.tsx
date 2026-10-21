"use client"

import React, { useMemo, useState } from "react"
import type { Person, Relationship } from "@family-tree/types"
import { describeRelationship } from "@/lib/relationship-finder"
import { daysUntilLabel, upcomingDates } from "@/lib/upcoming-dates"
import { titleCaseWords } from "@/lib/utils"

interface Props {
  people: Person[]
  relationships: Relationship[]
  onSelectPerson: (id: string) => void
}

const KIND_STYLES = {
  birthday: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  anniversary: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  remembrance: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
} as const

const KIND_LABELS = { birthday: "Birthday", anniversary: "Anniversary", remembrance: "Remembrance" } as const

const select =
  "min-h-11 w-full rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"

const nameOf = (p: Person) => `${titleCaseWords(p.first_name)} ${titleCaseWords(p.last_name)}`.trim()

export function FamilyInsights({ people, relationships, onSelectPerson }: Props) {
  const [tab, setTab] = useState<"upcoming" | "finder" | null>(null)
  const [aId, setAId] = useState("")
  const [bId, setBId] = useState("")

  const upcoming = useMemo(() => upcomingDates(people, relationships), [people, relationships])
  const sorted = useMemo(() => [...people].sort((x, y) => nameOf(x).localeCompare(nameOf(y))), [people])
  const result = useMemo(
    () => (aId && bId ? describeRelationship(people, relationships, aId, bId) : null),
    [people, relationships, aId, bId],
  )
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const tabButton = (key: "upcoming" | "finder", label: string) => (
    <button
      type="button"
      aria-expanded={tab === key}
      onClick={() => setTab(tab === key ? null : key)}
      className={`min-h-11 flex-1 rounded-md border px-3 text-sm font-medium ${
        tab === key
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
      }`}
    >
      {label}
      {key === "upcoming" && upcoming.length > 0 ? ` (${upcoming.length})` : ""}
    </button>
  )

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        {tabButton("upcoming", "Upcoming")}
        {tabButton("finder", "How related?")}
      </div>

      {tab === "upcoming" && (
        <div className="mt-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Nothing in the next 60 days. Birthdays need a birth date; anniversaries need a start date on a spouse link.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {upcoming.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => onSelectPerson(row.personId)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md border border-stone-200 p-2 text-left hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                  >
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLES[row.kind]}`}>
                      {KIND_LABELS[row.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                        {titleCaseWords(row.title)}
                      </span>
                      <span className="block truncate text-xs text-stone-600 dark:text-stone-300">{row.detail}</span>
                    </span>
                    <span className="shrink-0 text-xs text-stone-600 dark:text-stone-300">
                      <span className="block font-semibold">{daysUntilLabel(row.daysUntil)}</span>
                      <span className="block">
                        {row.date.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "finder" && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
            Person
            <select className={`${select} mt-1`} value={aId} onChange={(e) => setAId(e.target.value)}>
              <option value="">Choose a person…</option>
              {sorted.map((p) => (
                <option key={p.id} value={p.id}>
                  {nameOf(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
            Relative
            <select className={`${select} mt-1`} value={bId} onChange={(e) => setBId(e.target.value)}>
              <option value="">Choose a relative…</option>
              {sorted.map((p) => (
                <option key={p.id} value={p.id}>
                  {nameOf(p)}
                </option>
              ))}
            </select>
          </label>
          {aId && bId && (
            <div role="status" className="rounded-md bg-stone-100 p-3 text-sm text-stone-900 dark:bg-stone-800 dark:text-stone-50">
              {result ? (
                <>
                  <p className="font-semibold">{result.sentence}</p>
                  {result.path.length > 2 && (
                    <p className="mt-2 text-xs text-stone-600 dark:text-stone-300">
                      Path:{" "}
                      {result.path.map((id, index) => (
                        <React.Fragment key={`${id}-${index}`}>
                          {index > 0 && " → "}
                          <button type="button" className="underline" onClick={() => onSelectPerson(id)}>
                            {titleCaseWords(byId.get(id)?.first_name)}
                          </button>
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                </>
              ) : (
                <p>These two are not connected in the tree yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

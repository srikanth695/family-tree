import { describe, expect, it } from "vitest"
import type { Person, Relationship } from "@family-tree/types"
import { upcomingDates } from "./upcoming-dates"

const now = new Date("2026-10-21T10:00:00.000Z")
const person = (id: string, extra: Partial<Person> = {}): Person => ({
  id,
  tree_id: "t",
  first_name: id,
  ...extra,
})

describe("upcomingDates", () => {
  it("lists birthdays with the age being reached, soonest first", () => {
    const rows = upcomingDates(
      [
        person("late", { birth_date: "1990-11-10T00:00:00.000Z" }),
        person("today", { birth_date: "2000-10-21T00:00:00.000Z" }),
        person("far", { birth_date: "1980-03-01T00:00:00.000Z" }),
      ],
      [],
      now,
    )
    expect(rows.map((r) => [r.title, r.detail, r.daysUntil])).toEqual([
      ["today", "Turns 26", 0],
      ["late", "Turns 36", 20],
    ])
  })

  it("rolls over the year end", () => {
    const rows = upcomingDates([person("jan", { birth_date: "1990-01-02T00:00:00.000Z" })], [], new Date("2026-12-20T00:00:00.000Z"))
    expect(rows[0]).toMatchObject({ detail: "Turns 37", daysUntil: 13 })
  })

  it("adds anniversaries for living couples and remembrance days for the deceased", () => {
    const people = [
      person("a"),
      person("b"),
      person("gone", { is_living: false, birth_date: "1920-01-01T00:00:00.000Z", death_date: "2000-10-25T00:00:00.000Z" }),
    ]
    const rels = [
      { id: "r", tree_id: "t", person_a_id: "a", person_b_id: "b", type: "spouse", start_date: "2010-10-23T00:00:00.000Z" },
    ] as Relationship[]
    expect(upcomingDates(people, rels, now).map((r) => [r.kind, r.detail])).toEqual([
      ["anniversary", "16th anniversary"],
      ["remembrance", "26 years since passing"],
    ])
  })
})

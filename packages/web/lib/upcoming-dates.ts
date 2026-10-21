import type { Person, Relationship } from "@family-tree/types"

export interface UpcomingDate {
  key: string
  kind: "birthday" | "anniversary" | "remembrance"
  /** Person to select when the row is clicked. */
  personId: string
  title: string
  detail: string
  date: Date
  daysUntil: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function utcDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day)
}

/** Next occurrence of a month/day on or after today (Feb 29 falls on Mar 1 in non-leap years). */
function nextOccurrence(month: number, day: number, now: Date): { date: Date; year: number } {
  const today = utcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (let year = now.getUTCFullYear(); year <= now.getUTCFullYear() + 1; year++) {
    let ms = utcDay(year, month, day)
    if (new Date(ms).getUTCMonth() !== month) ms = utcDay(year, 2, 1)
    if (ms >= today) return { date: new Date(ms), year }
  }
  return { date: new Date(today), year: now.getUTCFullYear() }
}

function parse(value?: string | Date | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const fullName = (p: Pick<Person, "first_name" | "last_name">) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ")

/** Birthdays, wedding anniversaries and remembrance days within the next `withinDays` days. */
export function upcomingDates(
  people: Person[],
  relationships: Relationship[],
  now: Date = new Date(),
  withinDays = 60,
): UpcomingDate[] {
  const today = utcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const byId = new Map(people.map((p) => [p.id, p]))
  const rows: UpcomingDate[] = []

  const push = (row: Omit<UpcomingDate, "daysUntil">) => {
    const daysUntil = Math.round((row.date.getTime() - today) / DAY_MS)
    if (daysUntil <= withinDays) rows.push({ ...row, daysUntil })
  }

  for (const person of people) {
    const born = parse(person.birth_date)
    const died = parse(person.death_date)
    const deceased = person.is_living === false || Boolean(died)

    if (born && !deceased) {
      const { date, year } = nextOccurrence(born.getUTCMonth(), born.getUTCDate(), now)
      push({
        key: `birthday-${person.id}`,
        kind: "birthday",
        personId: person.id,
        title: fullName(person),
        detail: `Turns ${year - born.getUTCFullYear()}`,
        date,
      })
    }
    if (died) {
      const { date, year } = nextOccurrence(died.getUTCMonth(), died.getUTCDate(), now)
      push({
        key: `remembrance-${person.id}`,
        kind: "remembrance",
        personId: person.id,
        title: fullName(person),
        detail: `${year - died.getUTCFullYear()} years since passing`,
        date,
      })
    }
  }

  for (const rel of relationships) {
    if (rel.type !== "spouse" || rel.end_date || rel.status === "divorced" || rel.status === "widowed") continue
    const start = parse(rel.start_date)
    const a = byId.get(rel.person_a_id)
    const b = byId.get(rel.person_b_id)
    if (!start || !a || !b) continue
    // Anniversaries end with the first spouse's death.
    if (a.is_living === false || b.is_living === false || a.death_date || b.death_date) continue
    const { date, year } = nextOccurrence(start.getUTCMonth(), start.getUTCDate(), now)
    const years = year - start.getUTCFullYear()
    if (years <= 0) continue
    push({
      key: `anniversary-${rel.id ?? `${a.id}-${b.id}`}`,
      kind: "anniversary",
      personId: a.id,
      title: `${a.first_name} & ${b.first_name}`,
      detail: `${years}${years === 1 ? "st" : years === 2 ? "nd" : years === 3 ? "rd" : "th"} anniversary`,
      date,
    })
  }

  return rows.sort((x, y) => x.daysUntil - y.daysUntil || x.title.localeCompare(y.title))
}

export function daysUntilLabel(days: number): string {
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`
}

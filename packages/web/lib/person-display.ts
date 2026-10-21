type DateLike = string | Date | null | undefined

function yearOf(value: DateLike): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : new Date(time).getUTCFullYear()
}

/** "1945 – 2010", "b. 1990", or "1930 – ?" for someone deceased with no death date. */
export function lifespanLabel(person: {
  birth_date?: DateLike
  death_date?: DateLike
  is_living?: boolean | null
}): string {
  const born = yearOf(person.birth_date)
  const died = yearOf(person.death_date)
  const deceased = person.is_living === false || died !== null

  if (!deceased) return born !== null ? `b. ${born}` : ""
  if (born === null && died === null) return "Deceased"
  return `${born ?? "?"} – ${died ?? "?"}`
}

export function personInitials(person: { first_name?: string | null; last_name?: string | null }): string {
  const first = (person.first_name || "").trim().charAt(0)
  const last = (person.last_name || "").trim().charAt(0)
  return (first + last).toLocaleUpperCase() || "?"
}

/** Decade bucket such as "30–39", or "" without a birth date. Deceased people use their age at death. */
export function ageRangeLabel(
  person: { birth_date?: DateLike; death_date?: DateLike; is_living?: boolean | null },
  now: Date = new Date(),
): string {
  const born = person.birth_date ? new Date(person.birth_date) : null
  if (!born || Number.isNaN(born.getTime())) return ""
  const end = person.death_date ? new Date(person.death_date) : now
  if (Number.isNaN(end.getTime())) return ""
  let age = end.getUTCFullYear() - born.getUTCFullYear()
  const beforeBirthday =
    end.getUTCMonth() < born.getUTCMonth() ||
    (end.getUTCMonth() === born.getUTCMonth() && end.getUTCDate() < born.getUTCDate())
  if (beforeBirthday) age -= 1
  if (age < 0) return ""
  if (age >= 100) return "100+"
  const low = Math.floor(age / 10) * 10
  return `${low}–${low + 9}`
}

export type FamilyStanding = "married-in" | "married-out"

const norm = (value?: string | null) => (value || "").trim().toLocaleLowerCase()

/** "Muthyala" from a tree called "Muthyala", "Muthyala family" or "Muthyala family tree". */
export function familySurname(tree?: { family_name?: string | null; name?: string | null } | null): string {
  return (tree?.family_name || tree?.name || "")
    .trim()
    .replace(/\s+family(\s+tree)?$/i, "")
    .trim()
}

/**
 * Patrilineal rules around the tree's surname:
 *  - Men belong to the family when their surname matches and get no standing.
 *  - Women carry two surnames: the maiden name (from their parents) and the current one (from their
 *    in-laws). A woman whose maiden name is the family name was born in the family ("married-out"
 *    if she now carries another surname); otherwise she is "married-in" when her surname is the
 *    family name or her husband belongs to the family.
 * People who are simply born into the family get no standing.
 */
export function familyStandings(
  people: { id: string; gender?: string | null; last_name?: string | null; maiden_name?: string | null }[],
  relationships: { person_a_id: string; person_b_id: string; type: string }[],
  family: string,
): Map<string, FamilyStanding> {
  const result = new Map<string, FamilyStanding>()
  const surname = norm(family)
  if (!surname) return result

  const byId = new Map(people.map((p) => [p.id, p]))
  const spouses = new Map<string, string[]>()
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue
    spouses.set(rel.person_a_id, [...(spouses.get(rel.person_a_id) ?? []), rel.person_b_id])
    spouses.set(rel.person_b_id, [...(spouses.get(rel.person_b_id) ?? []), rel.person_a_id])
  }

  const isFemale = (p: { gender?: string | null }) => p.gender === "female"
  /** Born into the family: men by surname, women by maiden name (or surname when none is recorded). */
  const bornIn = (p: (typeof people)[number]) =>
    isFemale(p)
      ? norm(p.maiden_name) === surname || (!norm(p.maiden_name) && norm(p.last_name) === surname)
      : norm(p.last_name) === surname

  for (const person of people) {
    const partners = (spouses.get(person.id) ?? []).map((id) => byId.get(id)).filter(Boolean) as typeof people
    if (!partners.length) continue

    if (!isFemale(person)) continue
    if (bornIn(person)) {
      if (norm(person.last_name) && norm(person.last_name) !== surname) result.set(person.id, "married-out")
      continue
    }
    const husbandInFamily = partners.some((p) => !isFemale(p) && bornIn(p))
    if (norm(person.last_name) === surname || husbandInFamily) result.set(person.id, "married-in")
  }
  return result
}

/**
 * In-laws of one person: the parents of their spouse(s). A husband's parents are in-laws to the wife
 * and a wife's parents are in-laws to the husband.
 */
export function inLawIds(
  personId: string | null | undefined,
  relationships: { person_a_id: string; person_b_id: string; type: string }[],
): Set<string> {
  const result = new Set<string>()
  if (!personId) return result
  const parentTypes = new Set(["father-child", "mother-child", "parent-child", "adopted"])
  const spouseIds = new Set<string>()
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue
    if (rel.person_a_id === personId) spouseIds.add(rel.person_b_id)
    else if (rel.person_b_id === personId) spouseIds.add(rel.person_a_id)
  }
  for (const rel of relationships) {
    if (parentTypes.has(rel.type) && spouseIds.has(rel.person_b_id)) result.add(rel.person_a_id)
  }
  return result
}

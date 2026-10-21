import type { Person, Relationship } from "@family-tree/types"

type Rel = Pick<Relationship, "person_a_id" | "person_b_id" | "type">
type Who = Pick<Person, "id" | "first_name" | "last_name" | "gender">

const PARENT_TYPES = new Set(["father-child", "mother-child", "parent-child", "adopted"])

export interface RelationshipResult {
  /** "Ravi is Asha's second cousin once removed." */
  sentence: string
  /** Shortest chain of people through the tree, A first. */
  path: string[]
}

const ORDINALS = ["", "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"]

function ordinal(n: number): string {
  return n === 1 ? "" : ORDINALS[n] ?? `${n}th`
}

function times(n: number): string {
  return n === 1 ? "once" : n === 2 ? "twice" : `${n} times`
}

function pick(gender: string | null | undefined, male: string, female: string, neutral: string) {
  return gender === "male" ? male : gender === "female" ? female : neutral
}

function greats(n: number): string {
  if (n <= 0) return ""
  return n === 1 ? "great-" : n === 2 ? "great-great-" : `${n}x great-`
}

/** What a person of `gender` is to someone, given steps up (a) and down (b) via the closest shared ancestor. */
function bloodTerm(a: number, b: number, gender?: string | null): string {
  if (a === 0 && b === 0) return "the same person"
  if (a === 0) {
    if (b === 1) return pick(gender, "son", "daughter", "child")
    return `${greats(b - 2)}${pick(gender, "grandson", "granddaughter", "grandchild")}`
  }
  if (b === 0) {
    if (a === 1) return pick(gender, "father", "mother", "parent")
    return `${greats(a - 2)}${pick(gender, "grandfather", "grandmother", "grandparent")}`
  }
  if (a === 1 && b === 1) return pick(gender, "brother", "sister", "sibling")
  if (a === 1) {
    const base = pick(gender, "nephew", "niece", "nibling")
    return b === 2 ? base : `${b === 3 ? "grand" : `${greats(b - 3)}grand`}${base}`
  }
  if (b === 1) {
    const base = pick(gender, "uncle", "aunt", "aunt or uncle")
    return a === 2 ? base : `${a === 3 ? "great-" : `${greats(a - 2)}`}${base}`
  }
  const degree = Math.min(a, b) - 1
  const removed = Math.abs(a - b)
  const cousin = `${ordinal(degree)} cousin`.trim()
  return removed ? `${cousin} ${times(removed)} removed` : cousin
}

function parentsOf(rels: Rel[]) {
  const map = new Map<string, string[]>()
  for (const rel of rels) {
    if (!PARENT_TYPES.has(rel.type)) continue
    map.set(rel.person_b_id, [...(map.get(rel.person_b_id) ?? []), rel.person_a_id])
  }
  return map
}

/** Generations from `start` up to each ancestor (itself at 0), keeping the shortest. */
function ancestorDepths(start: string, parents: Map<string, string[]>): Map<string, number> {
  const depths = new Map<string, number>([[start, 0]])
  let frontier = [start]
  for (let depth = 1; frontier.length; depth++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const parent of parents.get(id) ?? []) {
        if (depths.has(parent)) continue
        depths.set(parent, depth)
        next.push(parent)
      }
    }
    frontier = next
  }
  return depths
}

/** Closest shared ancestor as [steps from A, steps from B], or null when not blood relatives. */
export function bloodDistance(aId: string, bId: string, rels: Rel[]): [number, number] | null {
  const parents = parentsOf(rels)
  const fromA = ancestorDepths(aId, parents)
  const fromB = ancestorDepths(bId, parents)
  let best: [number, number] | null = null
  for (const [id, a] of fromA) {
    const b = fromB.get(id)
    if (b === undefined) continue
    if (!best || a + b < best[0] + best[1]) best = [a, b]
  }
  if (best) return best
  const sibling = rels.some(
    (r) =>
      r.type === "sibling" &&
      ((r.person_a_id === aId && r.person_b_id === bId) || (r.person_a_id === bId && r.person_b_id === aId)),
  )
  return sibling ? [1, 1] : null
}

function spousesOf(id: string, rels: Rel[]): string[] {
  return rels
    .filter((r) => r.type === "spouse" && (r.person_a_id === id || r.person_b_id === id))
    .map((r) => (r.person_a_id === id ? r.person_b_id : r.person_a_id))
}

function shortestPath(aId: string, bId: string, rels: Rel[]): string[] {
  const adjacent = new Map<string, string[]>()
  for (const r of rels) {
    adjacent.set(r.person_a_id, [...(adjacent.get(r.person_a_id) ?? []), r.person_b_id])
    adjacent.set(r.person_b_id, [...(adjacent.get(r.person_b_id) ?? []), r.person_a_id])
  }
  const previous = new Map<string, string | null>([[aId, null]])
  const queue = [aId]
  while (queue.length) {
    const id = queue.shift() as string
    if (id === bId) break
    for (const next of adjacent.get(id) ?? []) {
      if (previous.has(next)) continue
      previous.set(next, id)
      queue.push(next)
    }
  }
  if (!previous.has(bId)) return []
  const path: string[] = []
  for (let at: string | null | undefined = bId; at; at = previous.get(at)) path.unshift(at)
  return path
}

/** B is blood kin of A's spouse. */
function inLawTerm(a: number, b: number, gender?: string | null): string {
  if (a === 1 && b === 1) return pick(gender, "brother-in-law", "sister-in-law", "sibling-in-law")
  if (a === 0 && b === 1) return pick(gender, "stepson", "stepdaughter", "stepchild")
  if (a === 1 && b === 0) return pick(gender, "father-in-law", "mother-in-law", "parent-in-law")
  return `${bloodTerm(a, b, gender)} by marriage`
}

/** Describes how B relates to A, or null when the tree does not connect them. */
export function describeRelationship(
  people: Who[],
  rels: Rel[],
  aId: string,
  bId: string,
): RelationshipResult | null {
  const byId = new Map(people.map((p) => [p.id, p]))
  const a = byId.get(aId)
  const b = byId.get(bId)
  if (!a || !b) return null
  if (aId === bId) return { sentence: `${a.first_name} and ${b.first_name} are the same person.`, path: [aId] }

  const finish = (term: string): RelationshipResult => ({
    sentence: `${b.first_name} is ${a.first_name}'s ${term}.`,
    path: shortestPath(aId, bId, rels),
  })

  const blood = bloodDistance(aId, bId, rels)
  if (blood) return finish(bloodTerm(blood[0], blood[1], b.gender))

  if (spousesOf(aId, rels).includes(bId)) return finish(pick(b.gender, "husband", "wife", "spouse"))

  for (const spouseId of spousesOf(aId, rels)) {
    const d = bloodDistance(spouseId, bId, rels)
    if (d) return finish(inLawTerm(d[0], d[1], b.gender))
  }
  for (const spouseId of spousesOf(bId, rels)) {
    const d = bloodDistance(aId, spouseId, rels)
    if (!d) continue
    if (d[0] === 1 && d[1] === 1) return finish(pick(b.gender, "brother-in-law", "sister-in-law", "sibling-in-law"))
    if (d[0] === 0 && d[1] === 1) return finish(pick(b.gender, "son-in-law", "daughter-in-law", "child-in-law"))
    const kin = byId.get(spouseId)
    return finish(
      `${pick(b.gender, "husband", "wife", "spouse")} of ${kin?.first_name ?? "a relative"}, their ${bloodTerm(d[0], d[1], kin?.gender)}`,
    )
  }

  const path = shortestPath(aId, bId, rels)
  if (!path.length) return null
  const between = path.length - 2
  return {
    sentence: `${b.first_name} is connected to ${a.first_name} through ${between} other ${between === 1 ? "person" : "people"}.`,
    path,
  }
}

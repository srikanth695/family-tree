const PARENT_TYPES = new Set([
  "father-child",
  "mother-child",
  "parent-child",
  "adopted",
  "guardian",
])

export type LayoutPerson = {
  id: string
  gender?: string | null
  first_name?: string | null
  last_name?: string | null
  birth_date?: string | Date | null
}

export type LayoutRelationship = {
  id: string
  person_a_id: string
  person_b_id: string
  type: string
}

export type TreePosition = { x: number; y: number }

export type SiblingGroup = {
  id: string
  fatherId?: string
  motherId?: string
  parentIds: string[]
  children: string[]
}

const NODE_WIDTH = 210
const H_GAP = 64
const V_GAP = 180
const SPOUSE_GAP = 64
const GENERATION_HEIGHT = 80 + V_GAP

function unique(ids: string[]) {
  return Array.from(new Set(ids))
}

function birthTime(value?: string | Date | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

function personSortKey(person?: LayoutPerson | null) {
  if (!person) return ""
  return `${birthTime(person.birth_date)}|${String(person.first_name || "").toLocaleLowerCase()}|${String(person.last_name || "").toLocaleLowerCase()}|${person.id}`
}

export function sortPersonIds(
  ids: string[],
  peopleById: Map<string, LayoutPerson>,
): string[] {
  return [...ids].sort((a, b) => {
    const personA = peopleById.get(a)
    const personB = peopleById.get(b)
    const birthDelta = birthTime(personA?.birth_date) - birthTime(personB?.birth_date)
    if (birthDelta !== 0) return birthDelta
    return personSortKey(personA).localeCompare(personSortKey(personB))
  })
}

/** Stable fingerprint of tree membership + relationships for layout invalidation. */
export function layoutStructureKey(
  people: LayoutPerson[],
  relationships: LayoutRelationship[],
): string {
  const personPart = [...people]
    .map((p) => p.id)
    .sort()
    .join(",")
  const relPart = [...relationships]
    .map((r) => `${r.id}:${r.type}:${r.person_a_id}:${r.person_b_id}`)
    .sort()
    .join("|")
  return `${personPart}::${relPart}`
}

export function getSiblingGroups(relationships: LayoutRelationship[]): SiblingGroup[] {
  const fatherOf = new Map<string, string>()
  const motherOf = new Map<string, string>()
  const parentsOf = new Map<string, string[]>()

  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.type)) continue
    const childId = rel.person_b_id
    const parentId = rel.person_a_id
    if (rel.type === "father-child") fatherOf.set(childId, parentId)
    if (rel.type === "mother-child") motherOf.set(childId, parentId)
    const list = parentsOf.get(childId) || []
    list.push(parentId)
    parentsOf.set(childId, list)
  }

  const groups = new Map<string, SiblingGroup>()
  const childIds = unique([...fatherOf.keys(), ...motherOf.keys(), ...parentsOf.keys()])

  for (const childId of childIds) {
    const fatherId = fatherOf.get(childId)
    const motherId = motherOf.get(childId)
    const parentIds = unique([
      ...(fatherId ? [fatherId] : []),
      ...(motherId ? [motherId] : []),
      ...(parentsOf.get(childId) || []),
    ]).sort()
    if (!parentIds.length) continue

    const key = `${fatherId || "none"}::${motherId || "none"}::${parentIds.join(",")}`
    const existing = groups.get(key)
    if (existing) {
      if (!existing.children.includes(childId)) existing.children.push(childId)
    } else {
      groups.set(key, {
        id: `junction:${key}`,
        fatherId,
        motherId,
        parentIds,
        children: [childId],
      })
    }
  }

  return Array.from(groups.values())
}

export function layoutFamilyTree(
  people: LayoutPerson[],
  relationships: LayoutRelationship[],
): Record<string, TreePosition> {
  if (!people.length) return {}

  const peopleById = new Map(people.map((p) => [p.id, p]))
  const spouseOf = new Map<string, string>()
  const childrenOf = new Map<string, string[]>()

  for (const rel of relationships) {
    if (rel.type === "spouse") {
      spouseOf.set(rel.person_a_id, rel.person_b_id)
      spouseOf.set(rel.person_b_id, rel.person_a_id)
      continue
    }
    if (!PARENT_TYPES.has(rel.type)) continue
    const list = childrenOf.get(rel.person_a_id) || []
    list.push(rel.person_b_id)
    childrenOf.set(rel.person_a_id, list)
  }

  const childIds = new Set<string>()
  for (const kids of childrenOf.values()) {
    for (const id of kids) childIds.add(id)
  }

  const positions: Record<string, TreePosition> = {}
  const placed = new Set<string>()

  const getCoupleChildren = (a: string, b?: string | null) => {
    const kids = [...(childrenOf.get(a) || [])]
    if (b) kids.push(...(childrenOf.get(b) || []))
    return sortPersonIds(unique(kids).filter((id) => peopleById.has(id)), peopleById)
  }

  const subtreeWidth = (personId: string, seen: Set<string>): number => {
    if (seen.has(personId)) return NODE_WIDTH
    seen.add(personId)
    const spouseId = spouseOf.get(personId)
    if (spouseId) seen.add(spouseId)

    const kids = getCoupleChildren(personId, spouseId)
    if (!kids.length) {
      return spouseId ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH
    }

    const kidsWidth = kids.reduce((sum, kid, index) => {
      return sum + subtreeWidth(kid, seen) + (index > 0 ? H_GAP : 0)
    }, 0)

    const coupleWidth = spouseId ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH
    return Math.max(coupleWidth, kidsWidth)
  }

  const placeUnit = (personId: string, left: number, depth: number, seen: Set<string>) => {
    if (seen.has(personId) || placed.has(personId)) return 0
    seen.add(personId)

    let spouseId = spouseOf.get(personId) || null
    if (spouseId) {
      const self = peopleById.get(personId)
      const spouse = peopleById.get(spouseId)
      // Always place husband (male) on the left when genders are known
      if (self?.gender === "female" && spouse?.gender === "male") {
        const swap = personId
        personId = spouseId
        spouseId = swap
      }
      seen.add(spouseId)
    }

    const width = subtreeWidth(personId, new Set())
    const kids = getCoupleChildren(personId, spouseId)
    const coupleWidth = spouseId ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH
    const coupleLeft = left + Math.max(0, (width - coupleWidth) / 2)
    const y = depth * GENERATION_HEIGHT

    positions[personId] = { x: coupleLeft, y }
    placed.add(personId)

    if (spouseId) {
      positions[spouseId] = { x: coupleLeft + NODE_WIDTH + SPOUSE_GAP, y }
      placed.add(spouseId)
    }

    if (kids.length) {
      const kidsWidth = kids.reduce((sum, kid, index) => {
        return sum + subtreeWidth(kid, new Set()) + (index > 0 ? H_GAP : 0)
      }, 0)
      let cursor = left + Math.max(0, (width - kidsWidth) / 2)
      for (const kid of kids) {
        const kidWidth = subtreeWidth(kid, new Set())
        placeUnit(kid, cursor, depth + 1, seen)
        cursor += kidWidth + H_GAP
      }
    }

    return width
  }

  const roots = sortPersonIds(
    people
      .map((p) => p.id)
      .filter((id) => !childIds.has(id))
      .filter((id) => {
        const spouseId = spouseOf.get(id)
        if (!spouseId) return true
        // Prefer male as root representative for a couple
        const self = peopleById.get(id)
        const spouse = peopleById.get(spouseId)
        if (self?.gender === "male" && spouse?.gender === "female") return true
        if (self?.gender === "female" && spouse?.gender === "male") return false
        return id < spouseId
      }),
    peopleById,
  )

  let cursor = 0
  for (const rootId of roots) {
    if (placed.has(rootId)) continue
    const width = subtreeWidth(rootId, new Set())
    placeUnit(rootId, cursor, 0, new Set())
    cursor += width + H_GAP * 2
  }

  const orphans = sortPersonIds(
    people.map((p) => p.id).filter((id) => !placed.has(id)),
    peopleById,
  )
  for (const id of orphans) {
    positions[id] = { x: cursor, y: 0 }
    cursor += NODE_WIDTH + H_GAP
  }

  return positions
}

export function junctionPosition(
  group: SiblingGroup,
  positions: Record<string, TreePosition>,
): TreePosition {
  const parentXs = group.parentIds
    .map((id) => positions[id])
    .filter(Boolean)
    .map((p) => p.x + NODE_WIDTH / 2)
  const childXs = group.children
    .map((id) => positions[id])
    .filter(Boolean)
    .map((p) => p.x + NODE_WIDTH / 2)
  const parentYs = group.parentIds
    .map((id) => positions[id])
    .filter(Boolean)
    .map((p) => p.y)
  const childYs = group.children
    .map((id) => positions[id])
    .filter(Boolean)
    .map((p) => p.y)

  // Center junction under the couple midpoint when both parents exist
  let x: number
  if (parentXs.length >= 2) {
    x = (Math.min(...parentXs) + Math.max(...parentXs)) / 2 - 4
  } else if (parentXs.length === 1 && childXs.length) {
    x = (parentXs[0] + childXs.reduce((a, b) => a + b, 0) / childXs.length) / 2 - 4
  } else {
    const xs = [...parentXs, ...childXs]
    x = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length - 4 : 0
  }

  const parentY = parentYs.length ? Math.max(...parentYs) : 0
  const childY = childYs.length ? Math.min(...childYs) : parentY + V_GAP
  const y = parentY + Math.max(48, (childY - parentY) / 2)

  return { x, y }
}

export function shortRelationshipLabel(type: string): string {
  switch (type) {
    case "father-child":
      return "Father"
    case "mother-child":
      return "Mother"
    case "parent-child":
      return "Parent"
    case "spouse":
      return "Husband / Wife"
    case "sibling":
      return "Sibling"
    case "adopted":
      return "Adopted"
    case "guardian":
      return "Guardian"
    default:
      return type
  }
}

export function spouseRelationshipLabel(
  genderA?: string | null,
  genderB?: string | null,
): string {
  const genders = [genderA, genderB]
  const hasMale = genders.includes("male")
  const hasFemale = genders.includes("female")
  if (hasMale && hasFemale) return "Husband / Wife"
  if (hasMale && !hasFemale) return "Husband"
  if (hasFemale && !hasMale) return "Wife"
  return "Husband / Wife"
}

const POSITIONS_KEY = (treeId: string) => `family-tree-positions:${treeId}`
const STRUCTURE_KEY = (treeId: string) => `family-tree-structure:${treeId}`

export function loadSavedPositions(treeId: string): Record<string, TreePosition> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(POSITIONS_KEY(treeId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function savePositions(treeId: string, positions: Record<string, TreePosition>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(POSITIONS_KEY(treeId), JSON.stringify(positions))
}

export function loadSavedStructureKey(treeId: string): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(STRUCTURE_KEY(treeId))
}

export function saveStructureKey(treeId: string, key: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STRUCTURE_KEY(treeId), key)
}

export function clearSavedLayout(treeId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(POSITIONS_KEY(treeId))
  window.localStorage.removeItem(STRUCTURE_KEY(treeId))
}

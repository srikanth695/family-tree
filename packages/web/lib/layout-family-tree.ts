const PARENT_TYPES = new Set([
  "father-child",
  "mother-child",
  "parent-child",
  "adopted",
  "guardian",
])

export type LayoutPerson = { id: string; gender?: string | null }
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
const H_GAP = 48
const V_GAP = 160
const SPOUSE_GAP = 56

function unique(ids: string[]) {
  return Array.from(new Set(ids))
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
    ])
    if (!parentIds.length) continue

    const key = `${fatherId || "none"}::${motherId || "none"}::${parentIds.slice().sort().join(",")}`
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
    return unique(kids).filter((id) => peopleById.has(id))
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
    const y = depth * (80 + V_GAP)

    positions[personId] = { x: coupleLeft, y }
    placed.add(personId)

    if (spouseId) {
      positions[spouseId] = { x: coupleLeft + NODE_WIDTH + SPOUSE_GAP, y }
      placed.add(spouseId)
    }

    if (kids.length) {
      let cursor = left
      for (const kid of kids) {
        const kidWidth = subtreeWidth(kid, new Set())
        placeUnit(kid, cursor, depth + 1, seen)
        cursor += kidWidth + H_GAP
      }
    }

    return width
  }

  const roots = people
    .map((p) => p.id)
    .filter((id) => !childIds.has(id))
    .filter((id) => {
      const spouseId = spouseOf.get(id)
      if (!spouseId) return true
      return id < spouseId
    })

  let cursor = 0
  for (const rootId of roots) {
    if (placed.has(rootId)) continue
    const width = subtreeWidth(rootId, new Set())
    placeUnit(rootId, cursor, 0, new Set())
    cursor += width + H_GAP * 2
  }

  for (const person of people) {
    if (placed.has(person.id)) continue
    positions[person.id] = { x: cursor, y: 0 }
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

  const xs = [...parentXs, ...childXs]
  const x = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length - 4 : 0
  const parentY = parentYs.length ? Math.max(...parentYs) : 0
  const childY = childYs.length ? Math.min(...childYs) : parentY + V_GAP
  const y = parentY + Math.max(40, (childY - parentY) / 2)

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

export function loadSavedPositions(treeId: string): Record<string, TreePosition> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(`family-tree-positions:${treeId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function savePositions(treeId: string, positions: Record<string, TreePosition>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(`family-tree-positions:${treeId}`, JSON.stringify(positions))
}

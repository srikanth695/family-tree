export function normalizeFamilyName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+family\s+tree$/i, '')
    .trim();
}

export function familyNameKey(value: string | null | undefined) {
  return normalizeFamilyName(String(value || '')).toLocaleLowerCase();
}

export function personAppearsOnTree(
  person: { tree_id: string; last_name?: string | null; maiden_name?: string | null },
  treeId: string,
  treeFamilyKey: string,
) {
  if (person.tree_id === treeId) return true;
  if (!treeFamilyKey) return false;
  return familyNameKey(person.last_name) === treeFamilyKey || familyNameKey(person.maiden_name) === treeFamilyKey;
}

/** Spouses of family members (for example a daughter's husband from another family). */
export function expandWithSpouses<T extends { id: string }>(
  members: T[],
  allPeople: T[],
  relationships: { type: string; person_a_id: string; person_b_id: string }[],
): T[] {
  const byId = new Map(allPeople.map((person) => [person.id, person]));
  const seen = new Set(members.map((person) => person.id));
  const next = [...members];

  for (const rel of relationships) {
    if (rel.type !== 'spouse') continue;
    const otherId = seen.has(rel.person_a_id)
      ? rel.person_b_id
      : seen.has(rel.person_b_id)
        ? rel.person_a_id
        : null;
    if (!otherId || seen.has(otherId)) continue;
    const spouse = byId.get(otherId);
    if (!spouse) continue;
    seen.add(otherId);
    next.push(spouse);
  }

  return next;
}

export function peopleVisibleOnFamilyTree<T extends { id: string; tree_id: string; last_name?: string | null; maiden_name?: string | null }>(
  treeId: string,
  treeFamilyKey: string,
  people: T[],
  relationships: { type: string; person_a_id: string; person_b_id: string }[],
): T[] {
  const members = people.filter((person) => personAppearsOnTree(person, treeId, treeFamilyKey));
  return expandWithSpouses(members, people, relationships);
}

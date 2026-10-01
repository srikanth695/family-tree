import prisma from '@family-tree/database';
import { familyNameKey, peopleVisibleOnFamilyTree } from './family-name';

export async function loadPeopleVisibleOnTree(treeId: string, accessibleTreeIds: string[] | null) {
  const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
  if (!tree) return [];

  const people = await prisma.people.findMany({
    where: accessibleTreeIds ? { tree_id: { in: accessibleTreeIds } } : undefined,
    orderBy: { created_at: 'asc' },
  });
  const ids = people.map((person) => person.id);
  const spouseRels = ids.length
    ? await prisma.relationship.findMany({
        where: {
          type: 'spouse',
          OR: [{ person_a_id: { in: ids } }, { person_b_id: { in: ids } }],
        },
        select: { type: true, person_a_id: true, person_b_id: true },
      })
    : [];

  return peopleVisibleOnFamilyTree(treeId, familyNameKey(tree.name), people, spouseRels);
}

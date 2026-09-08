import prisma from '@family-tree/database';

const PARENT_TYPES = ['father-child', 'mother-child', 'parent-child', 'adopted', 'guardian'];

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function ensureSiblingLinks(
  tx: Tx,
  treeId: string,
  childId: string,
  parentIds: string[],
) {
  if (!parentIds.length) return;

  const related = await tx.relationship.findMany({
    where: {
      tree_id: treeId,
      type: { in: PARENT_TYPES },
      person_a_id: { in: parentIds },
      NOT: { person_b_id: childId },
    },
    select: { person_b_id: true },
  });

  const siblingIds = Array.from(new Set(related.map((r) => r.person_b_id)));

  for (const siblingId of siblingIds) {
    const existing = await tx.relationship.findFirst({
      where: {
        tree_id: treeId,
        type: 'sibling',
        OR: [
          { person_a_id: childId, person_b_id: siblingId },
          { person_a_id: siblingId, person_b_id: childId },
        ],
      },
    });
    if (existing) continue;
    await tx.relationship.create({
      data: {
        tree_id: treeId,
        person_a_id: childId,
        person_b_id: siblingId,
        type: 'sibling',
      },
    });
  }
}

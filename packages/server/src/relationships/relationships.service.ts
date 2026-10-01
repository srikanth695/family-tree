import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '@family-tree/database';
import { AccessService } from '../common/access.service';
import { familyNameKey, personAppearsOnTree } from '../common/family-name';
import { pick, RELATIONSHIP_FIELDS } from '../common/pick';
import { sanitizeRelationshipInput } from '../common/sanitize';
import { ensureSiblingLinks } from '../common/siblings';
import { loadPeopleVisibleOnTree } from '../common/tree-members';

export const RELATIONSHIP_TYPES = [
  'father-child',
  'mother-child',
  'parent-child',
  'spouse',
  'sibling',
  'adopted',
  'guardian',
] as const;

const PARENT_TYPES = new Set(['father-child', 'mother-child', 'parent-child', 'adopted', 'guardian']);

@Injectable()
export class RelationshipsService {
  constructor(private access: AccessService) {}

  async create(treeId: string, data: Record<string, unknown>, creatorId: string) {
    await this.access.requireWriteAccess(treeId, creatorId);

    const fields = pick(sanitizeRelationshipInput(data), RELATIONSHIP_FIELDS);
    if (!fields.person_a_id || !fields.person_b_id || !fields.type) {
      throw new BadRequestException('person_a_id, person_b_id, and type are required');
    }
    if (fields.person_a_id === fields.person_b_id) {
      throw new BadRequestException('A person cannot be related to themselves');
    }
    if (!RELATIONSHIP_TYPES.includes(String(fields.type) as any)) {
      throw new BadRequestException('Invalid relationship type');
    }

    const [personA, personB] = await Promise.all([
      prisma.people.findUnique({ where: { id: String(fields.person_a_id) } }),
      prisma.people.findUnique({ where: { id: String(fields.person_b_id) } }),
    ]);

    if (
      !personA ||
      !(await this.personInTree(personA, treeId)) ||
      !personB ||
      !(await this.personInTree(personB, treeId))
    ) {
      throw new NotFoundException('Both people must belong to the specified tree');
    }

    await this.assertParentRules(String(fields.type), personA, personB, treeId);

    return prisma.$transaction(async (tx) => {
      const created = await tx.relationship.create({
        data: {
          ...fields,
          tree_id: treeId,
        } as any,
      });

      if (PARENT_TYPES.has(String(fields.type))) {
        await ensureSiblingLinks(tx, treeId, String(fields.person_b_id), [String(fields.person_a_id)]);
      }

      return created;
    });
  }

  async linkParents(
    treeId: string,
    childId: string | undefined,
    fatherId: string | null | undefined,
    motherId: string | null | undefined,
    creatorId: string,
  ) {
    if (!childId) {
      throw new BadRequestException('child_id is required');
    }
    await this.access.requireWriteAccess(treeId, creatorId);

    const child = await prisma.people.findUnique({ where: { id: childId } });
    if (!child || !(await this.personInTree(child, treeId))) {
      throw new NotFoundException('Child not found in this tree');
    }

    const existing = await prisma.relationship.findMany({
      where: {
        tree_id: treeId,
        person_b_id: childId,
        type: { in: ['father-child', 'mother-child'] },
      },
    });
    const existingFather = existing.find((r) => r.type === 'father-child')?.person_a_id;
    const existingMother = existing.find((r) => r.type === 'mother-child')?.person_a_id;

    const resolvedFatherId = existingFather || fatherId || null;
    const resolvedMotherId = existingMother || motherId || null;

    if (!resolvedFatherId || !resolvedMotherId) {
      throw new BadRequestException('Both father and mother are required');
    }
    if (resolvedFatherId === resolvedMotherId) {
      throw new BadRequestException('Father and mother must be different people');
    }
    if (existingFather && fatherId && fatherId !== existingFather) {
      throw new BadRequestException('This child already has a father linked');
    }
    if (existingMother && motherId && motherId !== existingMother) {
      throw new BadRequestException('This child already has a mother linked');
    }

    const father = await prisma.people.findUnique({ where: { id: resolvedFatherId } });
    const mother = await prisma.people.findUnique({ where: { id: resolvedMotherId } });
    if (!father || !(await this.personInTree(father, treeId)) || father.gender !== 'male') {
      throw new BadRequestException('Father must be a male person in this tree');
    }
    if (!mother || !(await this.personInTree(mother, treeId)) || mother.gender !== 'female') {
      throw new BadRequestException('Mother must be a female person in this tree');
    }

    return prisma.$transaction(async (tx) => {
      const created = [];

      if (!existingFather) {
        await this.assertParentRules('father-child', father, child, treeId);
        created.push(
          await tx.relationship.create({
            data: {
              tree_id: treeId,
              person_a_id: resolvedFatherId,
              person_b_id: childId,
              type: 'father-child',
            },
          }),
        );
      }

      if (!existingMother) {
        await this.assertParentRules('mother-child', mother, child, treeId);
        created.push(
          await tx.relationship.create({
            data: {
              tree_id: treeId,
              person_a_id: resolvedMotherId,
              person_b_id: childId,
              type: 'mother-child',
            },
          }),
        );
      }

      if (!created.length) {
        throw new BadRequestException('Both parents are already linked');
      }

      await ensureSiblingLinks(tx, treeId, childId, [resolvedFatherId, resolvedMotherId]);
      return created;
    });
  }

  private async assertParentRules(
    type: string,
    personA: { id: string; gender: string | null },
    personB: { id: string },
    treeId: string,
  ) {
    if (type === 'father-child') {
      if (personA.gender !== 'male') {
        throw new BadRequestException('Father must be male');
      }
      const existing = await prisma.relationship.findFirst({
        where: { tree_id: treeId, person_b_id: personB.id, type: 'father-child' },
      });
      if (existing) {
        throw new BadRequestException('This child already has a father linked');
      }
    }

    if (type === 'mother-child') {
      if (personA.gender !== 'female') {
        throw new BadRequestException('Mother must be female');
      }
      const existing = await prisma.relationship.findFirst({
        where: { tree_id: treeId, person_b_id: personB.id, type: 'mother-child' },
      });
      if (existing) {
        throw new BadRequestException('This child already has a mother linked');
      }
    }

    if (PARENT_TYPES.has(type) && type === 'parent-child') {
      // legacy generic parent link still allowed
    }
  }

  async findAll(treeId: string, userId: string) {
    await this.access.requireMembership(treeId, userId);
    const people = await this.peopleOnTree(treeId, userId);
    const ids = people.map((person) => person.id);
    if (!ids.length) return [];
    return prisma.relationship.findMany({
      where: {
        OR: [
          { tree_id: treeId },
          { person_a_id: { in: ids }, person_b_id: { in: ids } },
        ],
      },
      include: {
        person_a: true,
        person_b: true,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await this.access.requireRelationshipAccess(id, userId, true);
    const fields = pick(sanitizeRelationshipInput(data), RELATIONSHIP_FIELDS);

    const nextType = fields.type !== undefined ? String(fields.type) : existing.type;
    const nextA = fields.person_a_id !== undefined ? String(fields.person_a_id) : existing.person_a_id;
    const nextB = fields.person_b_id !== undefined ? String(fields.person_b_id) : existing.person_b_id;

    if (nextA === nextB) {
      throw new BadRequestException('A person cannot be related to themselves');
    }
    if (!RELATIONSHIP_TYPES.includes(nextType as any)) {
      throw new BadRequestException('Invalid relationship type');
    }

    const [personA, personB] = await Promise.all([
      prisma.people.findUnique({ where: { id: nextA } }),
      prisma.people.findUnique({ where: { id: nextB } }),
    ]);
    if (
      !personA ||
      !(await this.personInTree(personA, existing.tree_id)) ||
      !personB ||
      !(await this.personInTree(personB, existing.tree_id))
    ) {
      throw new NotFoundException('Both people must belong to the specified tree');
    }

    const typeChanged = nextType !== existing.type;
    const peopleChanged = nextA !== existing.person_a_id || nextB !== existing.person_b_id;
    if (typeChanged || peopleChanged) {
      // Temporarily ignore self when checking unique father/mother
      if (PARENT_TYPES.has(nextType)) {
        if (nextType === 'father-child' && personA.gender !== 'male') {
          throw new BadRequestException('Father must be male');
        }
        if (nextType === 'mother-child' && personA.gender !== 'female') {
          throw new BadRequestException('Mother must be female');
        }
        if (nextType === 'father-child' || nextType === 'mother-child') {
          const other = await prisma.relationship.findFirst({
            where: {
              tree_id: existing.tree_id,
              person_b_id: nextB,
              type: nextType,
              NOT: { id: existing.id },
            },
          });
          if (other) {
            throw new BadRequestException(
              nextType === 'father-child'
                ? 'This child already has a father linked'
                : 'This child already has a mother linked',
            );
          }
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.relationship.update({
        where: { id },
        data: fields as any,
      });

      if (PARENT_TYPES.has(nextType)) {
        await ensureSiblingLinks(tx, existing.tree_id, nextB, [nextA]);
      }

      return updated;
    });
  }

  async delete(id: string, userId: string) {
    await this.access.requireRelationshipAccess(id, userId, true);
    return prisma.relationship.delete({
      where: { id },
    });
  }

  private async personInTree(
    person: { tree_id: string; last_name?: string | null; maiden_name?: string | null },
    treeId: string,
  ) {
    const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
    if (!tree) return false;
    return personAppearsOnTree(person, treeId, familyNameKey(tree.name));
  }

  private async peopleOnTree(treeId: string, userId: string) {
    const systemRole = await this.access.getUserRole(userId);
    const accessibleIds =
      systemRole === 'admin'
        ? null
        : (
            await prisma.familyTree.findMany({
              where: { OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }] },
              select: { id: true },
            })
          ).map((item) => item.id);
    return loadPeopleVisibleOnTree(treeId, accessibleIds);
  }
}

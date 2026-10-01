import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import prisma from '@family-tree/database';
import { AccessService } from '../common/access.service';
import { familyNameKey, personAppearsOnTree } from '../common/family-name';
import { pick, PERSON_FIELDS } from '../common/pick';
import { sanitizePersonInput } from '../common/sanitize';
import { ensureSiblingLinks } from '../common/siblings';
import { loadPeopleVisibleOnTree } from '../common/tree-members';

@Injectable()
export class PeopleService {
  constructor(private access: AccessService) {}

  async create(treeId: string, data: Record<string, unknown>, creatorId: string) {
    await this.access.requireWriteAccess(treeId, creatorId);
    const fields = pick(sanitizePersonInput(data), PERSON_FIELDS);
    if (!fields.first_name || String(fields.first_name).trim() === '') {
      throw new BadRequestException('First name is required');
    }
    if (!fields.birth_date) {
      throw new BadRequestException('Birth date is required');
    }
    if (fields.gender !== 'male' && fields.gender !== 'female') {
      throw new BadRequestException('Gender must be male or female');
    }

    const fatherId = typeof data.father_id === 'string' && data.father_id ? data.father_id : null;
    const motherId = typeof data.mother_id === 'string' && data.mother_id ? data.mother_id : null;
    const isChild = Boolean(data.is_child) || Boolean(fatherId || motherId);

    if (isChild) {
      if (!fatherId || !motherId) {
        throw new BadRequestException('When adding a child, both father and mother must be selected');
      }
      if (fatherId === motherId) {
        throw new BadRequestException('Father and mother must be different people');
      }
    }

    if (fatherId || motherId) {
      await this.validateParents(treeId, fatherId, motherId);
    }

    return prisma.$transaction(async (tx) => {
      const person = await tx.people.create({
        data: {
          ...fields,
          first_name: String(fields.first_name).trim(),
          tree_id: treeId,
          created_by: creatorId,
          is_living: fields.death_date ? false : fields.is_living ?? true,
        } as any,
      });

      if (fatherId) {
        await tx.relationship.create({
          data: {
            tree_id: treeId,
            person_a_id: fatherId,
            person_b_id: person.id,
            type: 'father-child',
          },
        });
      }
      if (motherId) {
        await tx.relationship.create({
          data: {
            tree_id: treeId,
            person_a_id: motherId,
            person_b_id: person.id,
            type: 'mother-child',
          },
        });
      }

      const parentIds = [fatherId, motherId].filter(Boolean) as string[];
      if (parentIds.length) {
        await ensureSiblingLinks(tx, treeId, person.id, parentIds);
      }

      return person;
    });
  }

  private async validateParents(
    treeId: string,
    fatherId: string | null,
    motherId: string | null,
  ) {
    if (fatherId) {
      const father = await prisma.people.findUnique({ where: { id: fatherId } });
      if (!father || !(await this.personInTree(father, treeId))) {
        throw new NotFoundException('Father not found in this tree');
      }
      if (father.gender !== 'male') {
        throw new BadRequestException('Selected father must be male');
      }
    }
    if (motherId) {
      const mother = await prisma.people.findUnique({ where: { id: motherId } });
      if (!mother || !(await this.personInTree(mother, treeId))) {
        throw new NotFoundException('Mother not found in this tree');
      }
      if (mother.gender !== 'female') {
        throw new BadRequestException('Selected mother must be female');
      }
    }
  }

  async findAll(treeId: string, userId: string) {
    await this.access.requireMembership(treeId, userId);
    const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
    if (!tree) {
      throw new NotFoundException('Family tree not found');
    }
    const systemRole = await this.access.getUserRole(userId);
    const accessibleIds = systemRole === 'admin' ? null : await this.accessibleTreeIds(userId);
    return loadPeopleVisibleOnTree(treeId, accessibleIds);
  }

  private async accessibleTreeIds(userId: string) {
    const trees = await prisma.familyTree.findMany({
      where: { OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }] },
      select: { id: true },
    });
    return trees.map((tree) => tree.id);
  }

  private async personInTree(
    person: { tree_id: string; last_name?: string | null; maiden_name?: string | null },
    treeId: string,
  ) {
    const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
    if (!tree) return false;
    return personAppearsOnTree(person, treeId, familyNameKey(tree.name));
  }

  async findOne(id: string, userId: string) {
    const person = await this.access.requirePersonAccess(id, userId, false);
    return prisma.people.findUnique({
      where: { id: person.id },
      include: {
        relationships_as_a: true,
        relationships_as_b: true,
        life_events: true,
        media: true,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    await this.access.requirePersonAccess(id, userId, true);
    return prisma.people.update({
      where: { id },
      data: pick(sanitizePersonInput(data), PERSON_FIELDS) as any,
    });
  }

  async delete(id: string, userId: string) {
    const person = await this.access.requirePersonAccess(id, userId, false);
    await this.access.requireDeletePerson(userId);

    return prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({
        where: {
          OR: [{ person_a_id: id }, { person_b_id: id }],
        },
      });
      await tx.lifeEvent.deleteMany({ where: { person_id: id } });
      await tx.story.deleteMany({ where: { person_id: id } });
      await tx.media.deleteMany({ where: { person_id: id } });
      return tx.people.delete({ where: { id: person.id } });
    });
  }
}

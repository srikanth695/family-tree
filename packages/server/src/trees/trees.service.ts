import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '@family-tree/database';
import { AccessService } from '../common/access.service';
import { familyNameKey, normalizeFamilyName, personAppearsOnTree } from '../common/family-name';
import { ALL_ROLES } from '../common/pick';

@Injectable()
export class TreesService {
  constructor(private access: AccessService) {}

  async create(userId: string, name: string, _role?: string) {
    await this.access.requireCreateFamilyTree(userId);

    const cleaned = normalizeFamilyName(name || '');
    if (!cleaned) {
      throw new BadRequestException('Family name is required');
    }

    const existing = await this.findAccessibleTreeByFamilyName(userId, cleaned);
    if (existing) {
      return {
        ...existing,
        family_name: cleaned,
        display_name: `${cleaned} family tree`,
        created: false,
      };
    }

    const tree = await prisma.familyTree.create({
      data: {
        name: cleaned,
        owner_id: userId,
        members: {
          create: { user_id: userId, role: 'owner' },
        },
      },
      include: {
        members: true,
        _count: { select: { people: true } },
      },
    });

    return {
      ...tree,
      family_name: cleaned,
      display_name: `${cleaned} family tree`,
      created: true,
    };
  }

  async findMine(userId: string) {
    try {
      await this.ensureFamilyTreesFromPeople(userId);
    } catch {
      // Listing should still work even if auto-create fails.
    }

    const systemRole = await this.access.getUserRole(userId);
    const trees = await prisma.familyTree.findMany({
      where:
        systemRole === 'admin'
          ? undefined
          : {
              OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }],
            },
      include: {
        members: true,
        _count: { select: { people: true } },
      },
      orderBy: { name: 'asc' },
    });

    const byKey = new Map<string, (typeof trees)[number]>();
    for (const tree of trees) {
      const key = familyNameKey(tree.name);
      if (!key) continue;
      const current = byKey.get(key);
      if (!current || tree.created_at < current.created_at) {
        byKey.set(key, tree);
      }
    }

    const listed = Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    const people = await prisma.people.findMany({
      where:
        systemRole === 'admin'
          ? undefined
          : { tree_id: { in: listed.map((tree) => tree.id) } },
      select: { tree_id: true, last_name: true, maiden_name: true },
    });

    return listed.map((tree) => {
      const key = familyNameKey(tree.name);
      const peopleCount = people.filter((person) => personAppearsOnTree(person, tree.id, key)).length;
      return {
        ...tree,
        family_name: normalizeFamilyName(tree.name),
        display_name: `${normalizeFamilyName(tree.name)} family tree`,
        _count: { ...tree._count, people: peopleCount },
      };
    });
  }

  private async findAccessibleTreeByFamilyName(userId: string, familyName: string) {
    const trees = await prisma.familyTree.findMany({
      where: {
        OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }],
      },
      include: {
        members: true,
        _count: { select: { people: true } },
      },
    });
    const key = familyNameKey(familyName);
    return trees.find((tree) => familyNameKey(tree.name) === key) || null;
  }

  private async ensureFamilyTreesFromPeople(userId: string) {
    const trees = await prisma.familyTree.findMany({
      where: {
        OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }],
      },
      include: {
        people: {
          select: { last_name: true, maiden_name: true },
        },
      },
    });

    const existingKeys = new Set(
      trees.map((tree) => familyNameKey(tree.name)).filter(Boolean),
    );
    const namesToCreate = new Map<string, string>();

    for (const tree of trees) {
      const treeName = normalizeFamilyName(tree.name);
      if (treeName) namesToCreate.set(familyNameKey(treeName), treeName);

      for (const person of tree.people) {
        for (const raw of [person.last_name, person.maiden_name]) {
          const cleaned = normalizeFamilyName(String(raw || ''));
          if (!cleaned) continue;
          const key = familyNameKey(cleaned);
          if (!namesToCreate.has(key)) namesToCreate.set(key, cleaned);
        }
      }
    }

    for (const [key, name] of namesToCreate) {
      if (existingKeys.has(key)) continue;
      await prisma.familyTree.create({
        data: {
          name,
          owner_id: userId,
          members: {
            create: { user_id: userId, role: 'owner' },
          },
        },
      });
      existingKeys.add(key);
    }
  }

  async findOne(treeId: string, userId: string) {
    const { tree, role } = await this.access.requireMembership(treeId, userId);
    const familyName = normalizeFamilyName(tree.name);
    return {
      ...tree,
      my_role: role,
      family_name: familyName,
      display_name: `${familyName} family tree`,
    };
  }

  async update(treeId: string, userId: string, name: string) {
    await this.access.requireWriteAccess(treeId, userId);
    const cleaned = normalizeFamilyName(name || '');
    if (!cleaned) {
      throw new BadRequestException('Family name is required');
    }
    return prisma.familyTree.update({
      where: { id: treeId },
      data: { name: cleaned },
      include: {
        members: true,
        _count: { select: { people: true } },
      },
    });
  }

  async delete(treeId: string, userId: string) {
    await this.access.requireDeleteFamilyTree(userId);
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      include: { _count: { select: { people: true } } },
    });
    if (!tree) {
      throw new NotFoundException('Family tree not found');
    }

    await prisma.familyTree.delete({ where: { id: treeId } });
    return {
      id: treeId,
      deleted: true,
      name: tree.name,
      people_removed: tree._count.people,
    };
  }

  async addMember(treeId: string, actorId: string, email: string, role: string) {
    await this.access.requireManageTreeMembers(treeId, actorId);
    if (!email?.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!(ALL_ROLES as readonly string[]).includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      throw new NotFoundException('No account exists for that email');
    }
    return prisma.treeMember.upsert({
      where: { tree_id_user_id: { tree_id: treeId, user_id: user.id } },
      update: { role },
      create: { tree_id: treeId, user_id: user.id, role, invited_at: new Date() },
    });
  }
}

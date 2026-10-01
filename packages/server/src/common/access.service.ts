import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import prisma from '@family-tree/database';
import { hasRight, normalizeSystemRole } from '@family-tree/types';
import { canWrite } from './pick';

@Injectable()
export class AccessService {
  async getUserRole(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return normalizeSystemRole(user.role);
  }

  async requireAdmin(userId: string) {
    const role = await this.getUserRole(userId);
    if (!hasRight(role, 'manage_roles')) {
      throw new ForbiddenException('Only administrators can manage roles');
    }
    return role;
  }

  async requireMembership(treeId: string, userId: string) {
    const systemRole = await this.getUserRole(userId);
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      include: { members: true },
    });
    if (!tree) {
      throw new NotFoundException('Family tree not found');
    }

    if (systemRole === 'admin') {
      return { tree, role: 'owner', systemRole };
    }

    const membership =
      tree.members.find((m) => m.user_id === userId) ||
      (tree.owner_id === userId
        ? { role: 'owner', user_id: userId, tree_id: treeId }
        : null);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family tree');
    }

    return { tree, role: membership.role, systemRole };
  }

  async requireWriteAccess(treeId: string, userId: string) {
    const result = await this.requireMembership(treeId, userId);

    if (result.systemRole === 'admin') {
      return result;
    }

    if (hasRight(result.systemRole, 'edit_family_data')) {
      // family_tree_admin / family_admin can edit trees they belong to
      return result;
    }

    // Regular users need owner/editor tree membership
    if (!canWrite(result.role)) {
      throw new ForbiddenException('You do not have permission to edit this tree');
    }
    return result;
  }

  async requireCreateFamilyTree(userId: string) {
    const role = await this.getUserRole(userId);
    if (!hasRight(role, 'create_family_tree')) {
      throw new ForbiddenException('You do not have permission to create family trees');
    }
    return role;
  }

  async requireDeleteFamilyTree(userId: string) {
    const role = await this.getUserRole(userId);
    if (role !== 'admin' || !hasRight(role, 'delete_family_tree')) {
      throw new ForbiddenException('Only a full admin can delete family trees');
    }
    return role;
  }

  /** Full admin only — delete person from a tree */
  async requireDeletePerson(userId: string) {
    const role = await this.getUserRole(userId);
    if (role !== 'admin') {
      throw new ForbiddenException('Only a full admin can delete a person');
    }
    return role;
  }

  async requireManageTreeMembers(treeId: string, userId: string) {
    const result = await this.requireMembership(treeId, userId);
    if (result.systemRole === 'admin' || hasRight(result.systemRole, 'manage_tree_members')) {
      return result;
    }
    if (result.role === 'owner') {
      return result;
    }
    throw new ForbiddenException('You do not have permission to manage tree members');
  }

  async requirePersonAccess(personId: string, userId: string, write = false) {
    const person = await prisma.people.findUnique({ where: { id: personId } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (write) {
      await this.requireWriteAccess(person.tree_id, userId);
    } else {
      await this.requireMembership(person.tree_id, userId);
    }
    return person;
  }

  async requireRelationshipAccess(relationshipId: string, userId: string, write = false) {
    const rel = await prisma.relationship.findUnique({ where: { id: relationshipId } });
    if (!rel) {
      throw new NotFoundException('Relationship not found');
    }
    if (write) {
      await this.requireWriteAccess(rel.tree_id, userId);
    } else {
      await this.requireMembership(rel.tree_id, userId);
    }
    return rel;
  }

  async requireMediaAccess(mediaId: string, userId: string, write = false) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    if (write) {
      await this.requireWriteAccess(media.tree_id, userId);
    } else {
      await this.requireMembership(media.tree_id, userId);
    }
    return media;
  }

  async requireLifeEventAccess(eventId: string, userId: string, write = false) {
    const event = await prisma.lifeEvent.findUnique({
      where: { id: eventId },
      include: { person: true },
    });
    if (!event) {
      throw new NotFoundException('Life event not found');
    }
    if (write) {
      await this.requireWriteAccess(event.person.tree_id, userId);
    } else {
      await this.requireMembership(event.person.tree_id, userId);
    }
    return event;
  }
}

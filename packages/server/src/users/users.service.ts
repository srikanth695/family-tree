import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import prisma, { User } from '@family-tree/database';
import * as bcrypt from 'bcrypt';
import { isSystemRole, SystemRole } from '@family-tree/types';
import { toPublicUser, PublicUser } from '../common/public-user';
import { AccessService } from '../common/access.service';

@Injectable()
export class UsersService {
  constructor(private access: AccessService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: { email?: string; password?: string; name?: string }): Promise<PublicUser> {
    if (!data.email || !data.password) {
      throw new BadRequestException('Email and password are required');
    }
    if (data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await this.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name?.trim() || null,
        password_hash: hashedPassword,
        role: 'user',
      },
    });
    return toPublicUser(user);
  }

  async findAll(actorId: string) {
    await this.access.requireAdmin(actorId);
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
      },
    });
    return users;
  }

  async updateRole(actorId: string, userId: string, role: string) {
    await this.access.requireAdmin(actorId);

    if (!isSystemRole(role)) {
      throw new BadRequestException(
        'Invalid role. Use admin, family_tree_admin, family_admin, or user',
      );
    }

    const target = await this.findOneById(userId);
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (actorId === userId && role !== 'admin') {
      throw new ForbiddenException('You cannot remove your own admin role');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as SystemRole },
    });
    return toPublicUser(updated);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { toPublicUser, PublicUser } from '../common/public-user';
import prisma from '@family-tree/database';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<PublicUser | null> {
    if (!email || !pass) {
      return null;
    }
    const user = await this.usersService.findOneByEmail(email.toLowerCase());
    if (!user?.password_hash) {
      return null;
    }
    const matches = await bcrypt.compare(pass, user.password_hash);
    if (!matches) {
      return null;
    }
    return toPublicUser(user);
  }

  async login(user: PublicUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(data: { email?: string; password?: string; name?: string }) {
    const user = await this.usersService.create(data);
    return this.login(user);
  }

  async oauthUpsert(data: { email?: string; name?: string; avatar_url?: string }) {
    if (!data.email) {
      throw new UnauthorizedException('Email is required');
    }
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: data.name ?? undefined,
        avatar_url: data.avatar_url ?? undefined,
      },
      create: {
        email,
        name: data.name ?? null,
        avatar_url: data.avatar_url ?? null,
        role: 'user',
      },
    });
    return this.login(toPublicUser(user));
  }
}

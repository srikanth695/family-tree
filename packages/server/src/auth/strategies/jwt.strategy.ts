import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { getJwtSecret } from '../../common/jwt-secret';
import { toPublicUser } from '../../common/public-user';
import { Request } from 'express';

function fromAuthHeaderOrQuery(req: Request): string | null {
  const header = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (header) return header;
  const q = req.query?.access_token;
  return typeof q === 'string' && q.length > 0 ? q : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: fromAuthHeaderOrQuery,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub?: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }
}

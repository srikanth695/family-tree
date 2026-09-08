import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getInternalAuthSecret } from '../common/jwt-secret';
import { toPublicUser } from '../common/public-user';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email?: string; password?: string; name?: string }) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('oauth')
  async oauth(
    @Body() body: { email?: string; name?: string; avatar_url?: string },
    @Headers('x-internal-secret') secret: string,
  ) {
    if (!secret || secret !== getInternalAuthSecret()) {
      throw new UnauthorizedException();
    }
    return this.authService.oauthUpsert(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return toPublicUser(req.user);
  }
}

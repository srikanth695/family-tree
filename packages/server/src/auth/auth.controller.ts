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
import { LoginDto, OAuthUpsertDto, RegisterDto } from '../common/dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('oauth')
  async oauth(
    @Body() body: OAuthUpsertDto,
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

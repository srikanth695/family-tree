import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.id);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role?: string }, @Request() req) {
    return this.usersService.updateRole(req.user.id, id, body.role || '');
  }
}

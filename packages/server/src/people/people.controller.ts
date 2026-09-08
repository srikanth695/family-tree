import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PeopleService } from './people.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post('tree/:treeId')
  create(@Param('treeId') treeId: string, @Body() body: Record<string, unknown>, @Request() req) {
    return this.peopleService.create(treeId, body, req.user.id);
  }

  @Get('tree/:treeId')
  findAll(@Param('treeId') treeId: string, @Request() req) {
    return this.peopleService.findAll(treeId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.peopleService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Request() req) {
    return this.peopleService.update(id, body, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.peopleService.delete(id, req.user.id);
  }
}

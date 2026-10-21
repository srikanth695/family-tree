import { Controller, Post, Get, Patch, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TreesService } from './trees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddTreeMemberDto, CreateTreeDto, UpdateTreeDto, UpdateTreeLayoutDto } from '../common/dto';

@Controller('trees')
@UseGuards(JwtAuthGuard)
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Post()
  create(@Body() body: CreateTreeDto, @Request() req) {
    return this.treesService.create(req.user.id, body.name, req.user.role);
  }

  @Get()
  findMine(@Request() req) {
    return this.treesService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.treesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTreeDto, @Request() req) {
    return this.treesService.update(id, req.user.id, body.name);
  }

  @Put(':id/layout')
  saveLayout(@Param('id') id: string, @Body() body: UpdateTreeLayoutDto, @Request() req) {
    return this.treesService.saveLayout(id, req.user.id, body);
  }

  @Delete(':id/layout')
  resetLayout(@Param('id') id: string, @Request() req) {
    return this.treesService.resetLayout(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.treesService.delete(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: AddTreeMemberDto, @Request() req) {
    return this.treesService.addMember(id, req.user.id, body.email, body.role || 'viewer');
  }
}

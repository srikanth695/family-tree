import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRelationshipDto, LinkParentsDto, UpdateRelationshipDto } from '../common/dto';

@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post('tree/:treeId')
  create(@Param('treeId') treeId: string, @Body() body: CreateRelationshipDto, @Request() req) {
    return this.relationshipsService.create(
      treeId,
      body as unknown as Record<string, unknown>,
      req.user.id,
    );
  }

  @Post('tree/:treeId/link-parents')
  linkParents(@Param('treeId') treeId: string, @Body() body: LinkParentsDto, @Request() req) {
    return this.relationshipsService.linkParents(
      treeId,
      body.child_id,
      body.father_id,
      body.mother_id,
      req.user.id,
    );
  }

  @Get('tree/:treeId')
  findAll(@Param('treeId') treeId: string, @Request() req) {
    return this.relationshipsService.findAll(treeId, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateRelationshipDto, @Request() req) {
    return this.relationshipsService.update(
      id,
      body as unknown as Record<string, unknown>,
      req.user.id,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.relationshipsService.delete(id, req.user.id);
  }
}

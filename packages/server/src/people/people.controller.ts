import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PeopleService } from './people.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePersonDto, UpdatePersonDto } from '../common/dto';

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post('tree/:treeId')
  create(@Param('treeId') treeId: string, @Body() body: CreatePersonDto, @Request() req) {
    return this.peopleService.create(treeId, body as unknown as Record<string, unknown>, req.user.id);
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
  update(@Param('id') id: string, @Body() body: UpdatePersonDto, @Request() req) {
    return this.peopleService.update(id, body as unknown as Record<string, unknown>, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.peopleService.delete(id, req.user.id);
  }
}

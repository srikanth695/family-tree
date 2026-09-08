import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LifeEventService } from './life-events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLifeEventDto, UpdateLifeEventDto } from '../common/dto';

@Controller('life-events')
@UseGuards(JwtAuthGuard)
export class LifeEventController {
  constructor(private readonly lifeEventService: LifeEventService) {}

  @Post('person/:personId')
  create(@Param('personId') personId: string, @Body() body: CreateLifeEventDto, @Request() req) {
    return this.lifeEventService.create(
      personId,
      body as unknown as Record<string, unknown>,
      req.user.id,
    );
  }

  @Get('person/:personId')
  findAllByPerson(@Param('personId') personId: string, @Request() req) {
    return this.lifeEventService.findAllByPerson(personId, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateLifeEventDto, @Request() req) {
    return this.lifeEventService.update(id, body as unknown as Record<string, unknown>, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.lifeEventService.delete(id, req.user.id);
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import prisma from '@family-tree/database';
import { AccessService } from '../common/access.service';
import { pick, LIFE_EVENT_FIELDS } from '../common/pick';
import { sanitizeLifeEventInput } from '../common/sanitize';

@Injectable()
export class LifeEventService {
  constructor(private access: AccessService) {}

  async create(personId: string, data: Record<string, unknown>, creatorId: string) {
    const person = await this.access.requirePersonAccess(personId, creatorId, true);
    const fields = pick(sanitizeLifeEventInput(data), LIFE_EVENT_FIELDS);
    if (!fields.title || String(fields.title).trim() === '') {
      throw new BadRequestException('Title is required');
    }
    return prisma.lifeEvent.create({
      data: {
        ...fields,
        title: String(fields.title).trim(),
        type: String(fields.type || 'other'),
        person_id: person.id,
      } as any,
    });
  }

  async findAllByPerson(personId: string, userId: string) {
    await this.access.requirePersonAccess(personId, userId, false);
    return prisma.lifeEvent.findMany({
      where: { person_id: personId },
      orderBy: { event_date: 'asc' },
    });
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    await this.access.requireLifeEventAccess(id, userId, true);
    return prisma.lifeEvent.update({
      where: { id },
      data: pick(sanitizeLifeEventInput(data), LIFE_EVENT_FIELDS) as any,
    });
  }

  async delete(id: string, userId: string) {
    await this.access.requireLifeEventAccess(id, userId, true);
    return prisma.lifeEvent.delete({
      where: { id },
    });
  }
}

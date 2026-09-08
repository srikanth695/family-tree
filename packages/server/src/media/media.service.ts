import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import prisma from '@family-tree/database';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AccessService } from '../common/access.service';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads/media');

  constructor(private access: AccessService) {
    void this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async upload(
    treeId: string,
    personId: string | null,
    userId: string,
    file?: Express.Multer.File,
  ) {
    await this.access.requireWriteAccess(treeId, userId);

    if (!file?.buffer) {
      throw new BadRequestException('A file is required');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File must be 10MB or smaller');
    }

    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    let resolvedPersonId: string | null = personId && personId !== 'undefined' ? personId : null;
    if (resolvedPersonId) {
      const person = await prisma.people.findUnique({ where: { id: resolvedPersonId } });
      if (!person || person.tree_id !== treeId) {
        throw new NotFoundException('Person not found in this tree');
      }
    }

    await this.ensureDirectoryExists();
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    return prisma.media.create({
      data: {
        tree_id: treeId,
        person_id: resolvedPersonId,
        uploaded_by: userId,
        type: file.mimetype.startsWith('image/') ? 'photo' : 'document',
        file_url: `/uploads/media/${fileName}`,
        caption: path.basename(file.originalname || fileName).slice(0, 200),
      },
    });
  }

  async findAllByTree(treeId: string, userId: string) {
    await this.access.requireMembership(treeId, userId);
    return prisma.media.findMany({ where: { tree_id: treeId } });
  }

  async delete(id: string, userId: string) {
    const media = await this.access.requireMediaAccess(id, userId, true);
    const fileName = path.basename(media.file_url);
    const filePath = path.join(this.uploadDir, fileName);
    await fs.unlink(filePath).catch(() => undefined);
    return prisma.media.delete({ where: { id } });
  }
}

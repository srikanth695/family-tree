import {
  Injectable,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import prisma from '@family-tree/database';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AccessService } from '../common/access.service';
import { detectFileType } from '../common/file-type';
import { getMediaUploadDir } from '../common/upload-paths';

const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly uploadDir = getMediaUploadDir();

  constructor(private access: AccessService) {
    void this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    await fsPromises.mkdir(this.uploadDir, { recursive: true });
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

    const detected = detectFileType(file.buffer);
    if (!detected) {
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
    const fileName = `${uuidv4()}.${detected.ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    await fsPromises.writeFile(filePath, file.buffer);

    return prisma.media.create({
      data: {
        tree_id: treeId,
        person_id: resolvedPersonId,
        uploaded_by: userId,
        type: detected.mime.startsWith('image/') ? 'photo' : 'document',
        // Store relative path under media/; content served via /media/:id/file
        file_url: `media/${fileName}`,
        caption: path.basename(file.originalname || fileName).slice(0, 200),
      },
    });
  }

  async findAllByTree(treeId: string, userId: string) {
    await this.access.requireMembership(treeId, userId);
    return prisma.media.findMany({ where: { tree_id: treeId } });
  }

  async streamFile(id: string, userId: string): Promise<{ file: StreamableFile; mime: string }> {
    const media = await this.access.requireMediaAccess(id, userId, false);
    const fileName = path.basename(media.file_url);
    const filePath = path.join(this.uploadDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const ext = path.extname(fileName).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
              ? 'application/pdf'
              : 'image/jpeg';

    return {
      file: new StreamableFile(fs.createReadStream(filePath)),
      mime,
    };
  }

  async delete(id: string, userId: string) {
    const media = await this.access.requireMediaAccess(id, userId, true);
    const fileName = path.basename(media.file_url);
    const filePath = path.join(this.uploadDir, fileName);
    await fsPromises.unlink(filePath).catch(() => undefined);
    return prisma.media.delete({ where: { id } });
  }
}

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('tree/:treeId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('treeId') treeId: string,
    @Query('personId') personId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.mediaService.upload(treeId, personId || null, req.user.id, file);
  }

  @Get('tree/:treeId')
  findAllByTree(@Param('treeId') treeId: string, @Request() req) {
    return this.mediaService.findAllByTree(treeId, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.mediaService.delete(id, req.user.id);
  }
}

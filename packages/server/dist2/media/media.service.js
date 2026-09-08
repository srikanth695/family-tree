"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const fs = require("fs/promises");
const path = require("path");
const uuid_1 = require("uuid");
const access_service_1 = require("../common/access.service");
const ALLOWED_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
};
const MAX_BYTES = 10 * 1024 * 1024;
let MediaService = class MediaService {
    constructor(access) {
        this.access = access;
        this.uploadDir = path.resolve(process.cwd(), 'uploads/media');
        void this.ensureDirectoryExists();
    }
    async ensureDirectoryExists() {
        await fs.mkdir(this.uploadDir, { recursive: true });
    }
    async upload(treeId, personId, userId, file) {
        await this.access.requireWriteAccess(treeId, userId);
        if (!file?.buffer) {
            throw new common_1.BadRequestException('A file is required');
        }
        if (file.size > MAX_BYTES) {
            throw new common_1.BadRequestException('File must be 10MB or smaller');
        }
        const ext = ALLOWED_MIME[file.mimetype];
        if (!ext) {
            throw new common_1.BadRequestException('Unsupported file type');
        }
        let resolvedPersonId = personId && personId !== 'undefined' ? personId : null;
        if (resolvedPersonId) {
            const person = await database_1.default.people.findUnique({ where: { id: resolvedPersonId } });
            if (!person || person.tree_id !== treeId) {
                throw new common_1.NotFoundException('Person not found in this tree');
            }
        }
        await this.ensureDirectoryExists();
        const fileName = `${(0, uuid_1.v4)()}.${ext}`;
        const filePath = path.join(this.uploadDir, fileName);
        await fs.writeFile(filePath, file.buffer);
        return database_1.default.media.create({
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
    async findAllByTree(treeId, userId) {
        await this.access.requireMembership(treeId, userId);
        return database_1.default.media.findMany({ where: { tree_id: treeId } });
    }
    async delete(id, userId) {
        const media = await this.access.requireMediaAccess(id, userId, true);
        const fileName = path.basename(media.file_url);
        const filePath = path.join(this.uploadDir, fileName);
        await fs.unlink(filePath).catch(() => undefined);
        return database_1.default.media.delete({ where: { id } });
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_service_1.AccessService])
], MediaService);
//# sourceMappingURL=media.service.js.map
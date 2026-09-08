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
exports.TreesService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const access_service_1 = require("../common/access.service");
const pick_1 = require("../common/pick");
let TreesService = class TreesService {
    constructor(access) {
        this.access = access;
    }
    async create(userId, name) {
        if (!name?.trim()) {
            throw new common_1.BadRequestException('Tree name is required');
        }
        return database_1.default.familyTree.create({
            data: {
                name: name.trim(),
                owner_id: userId,
                members: {
                    create: { user_id: userId, role: 'owner' },
                },
            },
            include: { members: true },
        });
    }
    async findMine(userId) {
        return database_1.default.familyTree.findMany({
            where: {
                OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }],
            },
            include: {
                members: true,
                _count: { select: { people: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(treeId, userId) {
        const { tree, role } = await this.access.requireMembership(treeId, userId);
        return { ...tree, my_role: role };
    }
    async addMember(treeId, actorId, email, role) {
        const { role: actorRole } = await this.access.requireMembership(treeId, actorId);
        if (!email?.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        if (actorRole !== 'owner') {
            throw new common_1.ForbiddenException('Only owners can invite members');
        }
        if (!pick_1.ALL_ROLES.includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const user = await database_1.default.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            throw new common_1.NotFoundException('No account exists for that email');
        }
        return database_1.default.treeMember.upsert({
            where: { tree_id_user_id: { tree_id: treeId, user_id: user.id } },
            update: { role },
            create: { tree_id: treeId, user_id: user.id, role, invited_at: new Date() },
        });
    }
};
exports.TreesService = TreesService;
exports.TreesService = TreesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_service_1.AccessService])
], TreesService);
//# sourceMappingURL=trees.service.js.map
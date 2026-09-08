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
exports.PeopleService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const access_service_1 = require("../common/access.service");
const pick_1 = require("../common/pick");
let PeopleService = class PeopleService {
    constructor(access) {
        this.access = access;
    }
    async create(treeId, data, creatorId) {
        await this.access.requireWriteAccess(treeId, creatorId);
        const fields = (0, pick_1.pick)(data, pick_1.PERSON_FIELDS);
        if (!fields.first_name || String(fields.first_name).trim() === '') {
            throw new common_1.BadRequestException('First name is required');
        }
        return database_1.default.people.create({
            data: {
                ...fields,
                first_name: String(fields.first_name).trim(),
                tree_id: treeId,
                created_by: creatorId,
            },
        });
    }
    async findAll(treeId, userId) {
        await this.access.requireMembership(treeId, userId);
        return database_1.default.people.findMany({
            where: { tree_id: treeId },
            orderBy: { created_at: 'asc' },
        });
    }
    async findOne(id, userId) {
        const person = await this.access.requirePersonAccess(id, userId, false);
        return database_1.default.people.findUnique({
            where: { id: person.id },
            include: {
                relationships_as_a: true,
                relationships_as_b: true,
                life_events: true,
                media: true,
            },
        });
    }
    async update(id, data, userId) {
        await this.access.requirePersonAccess(id, userId, true);
        return database_1.default.people.update({
            where: { id },
            data: (0, pick_1.pick)(data, pick_1.PERSON_FIELDS),
        });
    }
    async delete(id, userId) {
        await this.access.requirePersonAccess(id, userId, true);
        return database_1.default.people.delete({
            where: { id },
        });
    }
};
exports.PeopleService = PeopleService;
exports.PeopleService = PeopleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_service_1.AccessService])
], PeopleService);
//# sourceMappingURL=people.service.js.map
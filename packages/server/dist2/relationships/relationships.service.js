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
exports.RelationshipsService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const access_service_1 = require("../common/access.service");
const pick_1 = require("../common/pick");
const RELATIONSHIP_TYPES = ['parent-child', 'spouse', 'sibling', 'adopted', 'guardian'];
let RelationshipsService = class RelationshipsService {
    constructor(access) {
        this.access = access;
    }
    async create(treeId, data, creatorId) {
        await this.access.requireWriteAccess(treeId, creatorId);
        const fields = (0, pick_1.pick)(data, pick_1.RELATIONSHIP_FIELDS);
        if (!fields.person_a_id || !fields.person_b_id || !fields.type) {
            throw new common_1.BadRequestException('person_a_id, person_b_id, and type are required');
        }
        if (fields.person_a_id === fields.person_b_id) {
            throw new common_1.BadRequestException('A person cannot be related to themselves');
        }
        if (!RELATIONSHIP_TYPES.includes(String(fields.type))) {
            throw new common_1.BadRequestException('Invalid relationship type');
        }
        const [personA, personB] = await Promise.all([
            database_1.default.people.findUnique({ where: { id: String(fields.person_a_id) } }),
            database_1.default.people.findUnique({ where: { id: String(fields.person_b_id) } }),
        ]);
        if (!personA || personA.tree_id !== treeId || !personB || personB.tree_id !== treeId) {
            throw new common_1.NotFoundException('Both people must belong to the specified tree');
        }
        return database_1.default.relationship.create({
            data: {
                ...fields,
                tree_id: treeId,
            },
        });
    }
    async findAll(treeId, userId) {
        await this.access.requireMembership(treeId, userId);
        return database_1.default.relationship.findMany({
            where: { tree_id: treeId },
            include: {
                person_a: true,
                person_b: true,
            },
        });
    }
    async delete(id, userId) {
        await this.access.requireRelationshipAccess(id, userId, true);
        return database_1.default.relationship.delete({
            where: { id },
        });
    }
};
exports.RelationshipsService = RelationshipsService;
exports.RelationshipsService = RelationshipsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_service_1.AccessService])
], RelationshipsService);
//# sourceMappingURL=relationships.service.js.map
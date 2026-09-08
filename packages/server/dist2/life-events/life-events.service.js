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
exports.LifeEventService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const access_service_1 = require("../common/access.service");
const pick_1 = require("../common/pick");
let LifeEventService = class LifeEventService {
    constructor(access) {
        this.access = access;
    }
    async create(personId, data, creatorId) {
        const person = await this.access.requirePersonAccess(personId, creatorId, true);
        const fields = (0, pick_1.pick)(data, pick_1.LIFE_EVENT_FIELDS);
        if (!fields.title || String(fields.title).trim() === '') {
            throw new common_1.BadRequestException('Title is required');
        }
        return database_1.default.lifeEvent.create({
            data: {
                ...fields,
                title: String(fields.title).trim(),
                type: String(fields.type || 'other'),
                person_id: person.id,
            },
        });
    }
    async findAllByPerson(personId, userId) {
        await this.access.requirePersonAccess(personId, userId, false);
        return database_1.default.lifeEvent.findMany({
            where: { person_id: personId },
            orderBy: { event_date: 'asc' },
        });
    }
    async update(id, data, userId) {
        await this.access.requireLifeEventAccess(id, userId, true);
        return database_1.default.lifeEvent.update({
            where: { id },
            data: (0, pick_1.pick)(data, pick_1.LIFE_EVENT_FIELDS),
        });
    }
    async delete(id, userId) {
        await this.access.requireLifeEventAccess(id, userId, true);
        return database_1.default.lifeEvent.delete({
            where: { id },
        });
    }
};
exports.LifeEventService = LifeEventService;
exports.LifeEventService = LifeEventService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_service_1.AccessService])
], LifeEventService);
//# sourceMappingURL=life-events.service.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const pick_1 = require("./pick");
let AccessService = class AccessService {
    async requireMembership(treeId, userId) {
        const tree = await database_1.default.familyTree.findUnique({
            where: { id: treeId },
            include: { members: true },
        });
        if (!tree) {
            throw new common_1.NotFoundException('Family tree not found');
        }
        const membership = tree.members.find((m) => m.user_id === userId) ||
            (tree.owner_id === userId
                ? { role: 'owner', user_id: userId, tree_id: treeId }
                : null);
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this family tree');
        }
        return { tree, role: membership.role };
    }
    async requireWriteAccess(treeId, userId) {
        const result = await this.requireMembership(treeId, userId);
        if (!(0, pick_1.canWrite)(result.role)) {
            throw new common_1.ForbiddenException('You do not have permission to edit this tree');
        }
        return result;
    }
    async requirePersonAccess(personId, userId, write = false) {
        const person = await database_1.default.people.findUnique({ where: { id: personId } });
        if (!person) {
            throw new common_1.NotFoundException('Person not found');
        }
        if (write) {
            await this.requireWriteAccess(person.tree_id, userId);
        }
        else {
            await this.requireMembership(person.tree_id, userId);
        }
        return person;
    }
    async requireRelationshipAccess(relationshipId, userId, write = false) {
        const rel = await database_1.default.relationship.findUnique({ where: { id: relationshipId } });
        if (!rel) {
            throw new common_1.NotFoundException('Relationship not found');
        }
        if (write) {
            await this.requireWriteAccess(rel.tree_id, userId);
        }
        else {
            await this.requireMembership(rel.tree_id, userId);
        }
        return rel;
    }
    async requireMediaAccess(mediaId, userId, write = false) {
        const media = await database_1.default.media.findUnique({ where: { id: mediaId } });
        if (!media) {
            throw new common_1.NotFoundException('Media not found');
        }
        if (write) {
            await this.requireWriteAccess(media.tree_id, userId);
        }
        else {
            await this.requireMembership(media.tree_id, userId);
        }
        return media;
    }
    async requireLifeEventAccess(eventId, userId, write = false) {
        const event = await database_1.default.lifeEvent.findUnique({
            where: { id: eventId },
            include: { person: true },
        });
        if (!event) {
            throw new common_1.NotFoundException('Life event not found');
        }
        if (write) {
            await this.requireWriteAccess(event.person.tree_id, userId);
        }
        else {
            await this.requireMembership(event.person.tree_id, userId);
        }
        return event;
    }
};
exports.AccessService = AccessService;
exports.AccessService = AccessService = __decorate([
    (0, common_1.Injectable)()
], AccessService);
//# sourceMappingURL=access.service.js.map
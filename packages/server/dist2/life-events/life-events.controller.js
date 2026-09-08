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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifeEventController = void 0;
const common_1 = require("@nestjs/common");
const life_events_service_1 = require("./life-events.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let LifeEventController = class LifeEventController {
    constructor(lifeEventService) {
        this.lifeEventService = lifeEventService;
    }
    create(personId, body, req) {
        return this.lifeEventService.create(personId, body, req.user.id);
    }
    findAllByPerson(personId, req) {
        return this.lifeEventService.findAllByPerson(personId, req.user.id);
    }
    update(id, body, req) {
        return this.lifeEventService.update(id, body, req.user.id);
    }
    remove(id, req) {
        return this.lifeEventService.delete(id, req.user.id);
    }
};
exports.LifeEventController = LifeEventController;
__decorate([
    (0, common_1.Post)('person/:personId'),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LifeEventController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('person/:personId'),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LifeEventController.prototype, "findAllByPerson", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LifeEventController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LifeEventController.prototype, "remove", null);
exports.LifeEventController = LifeEventController = __decorate([
    (0, common_1.Controller)('life-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [life_events_service_1.LifeEventService])
], LifeEventController);
//# sourceMappingURL=life-events.controller.js.map
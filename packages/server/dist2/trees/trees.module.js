"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreesModule = void 0;
const common_1 = require("@nestjs/common");
const trees_service_1 = require("./trees.service");
const trees_controller_1 = require("./trees.controller");
const common_module_1 = require("../common/common.module");
let TreesModule = class TreesModule {
};
exports.TreesModule = TreesModule;
exports.TreesModule = TreesModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule],
        controllers: [trees_controller_1.TreesController],
        providers: [trees_service_1.TreesService],
        exports: [trees_service_1.TreesService],
    })
], TreesModule);
//# sourceMappingURL=trees.module.js.map
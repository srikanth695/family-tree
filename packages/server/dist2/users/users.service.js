"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@family-tree/database");
const bcrypt = require("bcrypt");
const public_user_1 = require("../common/public-user");
let UsersService = class UsersService {
    async findOneByEmail(email) {
        return database_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }
    async findOneById(id) {
        return database_1.default.user.findUnique({
            where: { id },
        });
    }
    async create(data) {
        if (!data.email || !data.password) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        if (data.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const email = data.email.toLowerCase().trim();
        const existing = await this.findOneByEmail(email);
        if (existing) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await database_1.default.user.create({
            data: {
                email,
                name: data.name?.trim() || null,
                password_hash: hashedPassword,
                role: 'user',
            },
        });
        return (0, public_user_1.toPublicUser)(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)()
], UsersService);
//# sourceMappingURL=users.service.js.map
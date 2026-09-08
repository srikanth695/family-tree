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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const public_user_1 = require("../common/public-user");
const database_1 = require("@family-tree/database");
let AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async validateUser(email, pass) {
        if (!email || !pass) {
            return null;
        }
        const user = await this.usersService.findOneByEmail(email.toLowerCase());
        if (!user?.password_hash) {
            return null;
        }
        const matches = await bcrypt.compare(pass, user.password_hash);
        if (!matches) {
            return null;
        }
        return (0, public_user_1.toPublicUser)(user);
    }
    async login(user) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
    async register(data) {
        const user = await this.usersService.create(data);
        return this.login(user);
    }
    async oauthUpsert(data) {
        if (!data.email) {
            throw new common_1.UnauthorizedException('Email is required');
        }
        const email = data.email.toLowerCase().trim();
        const user = await database_1.default.user.upsert({
            where: { email },
            update: {
                name: data.name ?? undefined,
                avatar_url: data.avatar_url ?? undefined,
            },
            create: {
                email,
                name: data.name ?? null,
                avatar_url: data.avatar_url ?? null,
                role: 'user',
            },
        });
        return this.login((0, public_user_1.toPublicUser)(user));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
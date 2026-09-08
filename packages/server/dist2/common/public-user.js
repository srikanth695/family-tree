"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = toPublicUser;
function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url ?? null,
        role: user.role ?? 'user',
        created_at: user.created_at,
    };
}
//# sourceMappingURL=public-user.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
exports.getInternalAuthSecret = getInternalAuthSecret;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function getJwtSecret() {
    return process.env.JWT_SECRET || 'development_secret_key_change_me';
}
function getInternalAuthSecret() {
    return process.env.INTERNAL_AUTH_SECRET || 'development_internal_secret_change_me';
}
//# sourceMappingURL=jwt-secret.js.map
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'development_secret_key_change_me';
}

export function getInternalAuthSecret(): string {
  return process.env.INTERNAL_AUTH_SECRET || 'development_internal_secret_change_me';
}

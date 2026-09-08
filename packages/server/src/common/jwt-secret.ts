import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireSecret(name: string, value: string | undefined, devFallback: string): string {
  if (value && value.trim()) {
    return value;
  }
  if (isProduction()) {
    throw new Error(`${name} must be set when NODE_ENV=production`);
  }
  return devFallback;
}

export function getJwtSecret(): string {
  return requireSecret(
    'JWT_SECRET',
    process.env.JWT_SECRET,
    'development_secret_key_change_me',
  );
}

export function getInternalAuthSecret(): string {
  return requireSecret(
    'INTERNAL_AUTH_SECRET',
    process.env.INTERNAL_AUTH_SECRET,
    'development_internal_secret_change_me',
  );
}

import { BadRequestException } from '@nestjs/common';

export function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

export function toDateOrUndefined(value: unknown): Date | undefined {
  const cleaned = emptyToUndefined(value);
  if (cleaned === undefined) return undefined;
  if (cleaned instanceof Date) {
    if (Number.isNaN(cleaned.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return cleaned;
  }
  const raw = String(cleaned).trim();
  if (!raw) return undefined;
  // HTML date inputs send YYYY-MM-DD; normalize to UTC midnight.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date: ${raw}`);
  }
  return parsed;
}

export function sanitizePersonInput(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'birth_date' || key === 'death_date') {
      const date = toDateOrUndefined(value);
      if (date !== undefined) next[key] = date;
      continue;
    }
    const cleaned = emptyToUndefined(value);
    if (cleaned !== undefined) next[key] = cleaned;
  }
  return next;
}

export function sanitizeRelationshipInput(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'start_date' || key === 'end_date') {
      const date = toDateOrUndefined(value);
      if (date !== undefined) next[key] = date;
      continue;
    }
    const cleaned = emptyToUndefined(value);
    if (cleaned !== undefined) next[key] = cleaned;
  }
  return next;
}

export function sanitizeLifeEventInput(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'event_date') {
      const date = toDateOrUndefined(value);
      if (date !== undefined) next[key] = date;
      continue;
    }
    const cleaned = emptyToUndefined(value);
    if (cleaned !== undefined) next[key] = cleaned;
  }
  return next;
}

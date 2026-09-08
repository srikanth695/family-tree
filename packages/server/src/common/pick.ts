export function pick<T extends Record<string, unknown>>(
  source: T,
  allowed: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

export const PERSON_FIELDS = [
  'first_name',
  'last_name',
  'maiden_name',
  'nicknames',
  'gender',
  'birth_date',
  'birth_date_precision',
  'birth_place',
  'death_date',
  'death_date_precision',
  'death_place',
  'is_living',
  'bio',
  'occupation',
  'religion',
  'nationality',
  'languages',
  'cause_of_death',
  'burial_place',
] as const;

export const RELATIONSHIP_FIELDS = [
  'person_a_id',
  'person_b_id',
  'type',
  'start_date',
  'end_date',
  'status',
] as const;

export const LIFE_EVENT_FIELDS = [
  'type',
  'title',
  'description',
  'event_date',
  'place',
] as const;

export const WRITE_ROLES = ['owner', 'editor'] as const;
export const ALL_ROLES = ['owner', 'editor', 'viewer'] as const;

export function canWrite(role: string): boolean {
  return (WRITE_ROLES as readonly string[]).includes(role);
}

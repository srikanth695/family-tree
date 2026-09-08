export declare function pick<T extends Record<string, unknown>>(source: T, allowed: readonly string[]): Record<string, unknown>;
export declare const PERSON_FIELDS: readonly ["first_name", "last_name", "maiden_name", "nicknames", "gender", "birth_date", "birth_date_precision", "birth_place", "death_date", "death_date_precision", "death_place", "is_living", "bio", "occupation", "religion", "nationality", "languages", "cause_of_death", "burial_place"];
export declare const RELATIONSHIP_FIELDS: readonly ["person_a_id", "person_b_id", "type", "start_date", "end_date", "status"];
export declare const LIFE_EVENT_FIELDS: readonly ["type", "title", "description", "event_date", "place"];
export declare const WRITE_ROLES: readonly ["owner", "editor"];
export declare const ALL_ROLES: readonly ["owner", "editor", "viewer"];
export declare function canWrite(role: string): boolean;

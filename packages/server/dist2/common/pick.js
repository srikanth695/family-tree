"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_ROLES = exports.WRITE_ROLES = exports.LIFE_EVENT_FIELDS = exports.RELATIONSHIP_FIELDS = exports.PERSON_FIELDS = void 0;
exports.pick = pick;
exports.canWrite = canWrite;
function pick(source, allowed) {
    const result = {};
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}
exports.PERSON_FIELDS = [
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
];
exports.RELATIONSHIP_FIELDS = [
    'person_a_id',
    'person_b_id',
    'type',
    'start_date',
    'end_date',
    'status',
];
exports.LIFE_EVENT_FIELDS = [
    'type',
    'title',
    'description',
    'event_date',
    'place',
];
exports.WRITE_ROLES = ['owner', 'editor'];
exports.ALL_ROLES = ['owner', 'editor', 'viewer'];
function canWrite(role) {
    return exports.WRITE_ROLES.includes(role);
}
//# sourceMappingURL=pick.js.map
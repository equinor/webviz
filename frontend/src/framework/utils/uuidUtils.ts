/**
 * Regex pattern for a UUID.
 *
 * A string that represents a regex pattern for a UUID
 *
 * From: https://github.com/uuidjs/uuid/blob/main/src/regex.ts
 */
// export const UUID_REGEX_STRING = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}";
export const UUID_REGEX_STRING =
    "(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)";

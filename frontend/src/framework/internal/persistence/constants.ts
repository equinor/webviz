/**
 * Constants for the persistence feature
 */

// Debounce delay for auto-save to local storage (in milliseconds)
export const AUTO_SAVE_DEBOUNCE_MS = 200;

// Interval for polling backend to check for external updates (in milliseconds)
export const BACKEND_POLLING_INTERVAL_MS = 10000;

// Maximum content size for sessions and snapshots (in bytes)
// CosmosDB has a 2MB document limit; we use 1.5MB to leave room for metadata
export const MAX_CONTENT_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB

// Maximum lengths for user input
export const MAX_TITLE_LENGTH = 50;
export const MIN_TITLE_LENGTH = 10;
export const MAX_DESCRIPTION_LENGTH = 250;

// Nano ID lengths for sessions and snapshots
export const SESSION_ID_LENGTH = 12;
export const SNAPSHOT_ID_LENGTH = 12;
// Dashboard IDs used to be uuid.v4() (36 chars); kept the same length as session/snapshot IDs for a
// consistent URL shape. Older persisted sessions may still contain longer, uuid.v4()-shaped dashboard
// IDs until a migration is implemented - see the backward-compat note in WorkbenchSession/utils/url.ts.
export const DASHBOARD_ID_LENGTH = 12;

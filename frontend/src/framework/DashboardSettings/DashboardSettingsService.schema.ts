import type { JTDSchemaType } from "ajv/dist/core";

// The state of one active dashboard setting. `constraintOverride` is only stored while the setting has one (e.g. from
// a template). Both are stored as returned by the definition (`serializeValue`) or as-is (the override, which must
// therefore round-trip through JSON). `value` is always written, but optional here - JTD can't require a key that
// may hold any value - so an entry without one is skipped on load.
export type SerializedDashboardSettingState = {
    value?: unknown;
    constraintOverride?: unknown;
};

// By dashboard setting key
export type SerializedDashboardSettingsState = Record<string, SerializedDashboardSettingState>;

export const DASHBOARD_SETTINGS_STATE_SCHEMA: JTDSchemaType<SerializedDashboardSettingsState> = {
    values: {
        optionalProperties: {
            value: {},
            constraintOverride: {},
        },
    },
} as const;

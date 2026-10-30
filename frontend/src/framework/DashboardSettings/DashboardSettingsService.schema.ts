import type { JTDSchemaType } from "ajv/dist/core";

export type SerializedDashboardSettingsState = Record<string, unknown>;

export const DASHBOARD_SETTINGS_STATE_SCHEMA: JTDSchemaType<SerializedDashboardSettingsState> = {
    values: {},
} as const;

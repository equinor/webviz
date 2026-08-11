import type { JTDSchemaType } from "ajv/dist/core";

export type SerializedElevatedSettingsState = Record<string, unknown>;

export const ELEVATED_SETTINGS_STATE_SCHEMA: JTDSchemaType<SerializedElevatedSettingsState> = {
    values: {},
} as const;

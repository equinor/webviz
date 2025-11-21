import type { ModuleComponentSerializationFunctions, ModuleStateSchema } from "@framework/Module";

import {
    deserializeSettings,
    serializeSettings,
    SETTINGS_STATE_SCHEMA,
    type SerializedSettings,
} from "./settings/persistence";

export type SerializedState = {
    settings: SerializedSettings;
};

export const STATE_SCHEMA: ModuleStateSchema<SerializedState> = {
    settings: SETTINGS_STATE_SCHEMA,
} as const;

export const serializeStateFunctions: ModuleComponentSerializationFunctions<SerializedState> = {
    serializeStateFunctions: { settings: serializeSettings },
    deserializeStateFunctions: { settings: deserializeSettings },
};

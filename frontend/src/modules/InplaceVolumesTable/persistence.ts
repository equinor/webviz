import type { ModuleComponentSerializationFunctions, ModuleStateSchema } from "@framework/Module";

import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    serializeSettings,
    type SerializedSettings,
} from "./settings/persistence";

export type SerializedState = {
    settings: SerializedSettings;
    view: never;
};

export const SERIALIZED_STATE: ModuleStateSchema<SerializedState> = {
    settings: SERIALIZED_SETTINGS_SCHEMA,
} as const;

export const serializeStateFunctions: ModuleComponentSerializationFunctions<SerializedState> = {
    serializeStateFunctions: {
        settings: serializeSettings,
    },
    deserializeStateFunctions: {
        settings: deserializeSettings,
    },
};

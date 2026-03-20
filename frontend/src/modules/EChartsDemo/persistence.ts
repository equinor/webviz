import type { ModuleComponentSerializationFunctions, ModuleStateSchema } from "@framework/Module";

import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    serializeSettings,
    type SerializedSettings,
} from "./settings/persistence";
import { deserializeView, serializeView } from "./view/persistence";

export type SerializedState = {
    settings: SerializedSettings;
};

export const SERIALIZED_STATE_SCHEMA: ModuleStateSchema<SerializedState> = {
    settings: SERIALIZED_SETTINGS_SCHEMA,
} as const;

export const serializeStateFunctions: ModuleComponentSerializationFunctions<SerializedState> = {
    serializeStateFunctions: {
        settings: serializeSettings, view: serializeView,

    },
    deserializeStateFunctions: {
        settings: deserializeSettings, view: deserializeView,
    },
};

import type { ModuleComponentSerializationFunctions, ModuleStateSchema } from "@framework/Module";
import {
    deserializeSettings,
    SERIALIZED_SETTINGS,
    serializeSettings,
    type SerializedSettings,
} from "@modules/2DViewer/settings/persistence";

import { deserializeView, SERIALIZED_VIEW, serializeView, type SerializedView } from "./view/persistence";

export type SerializedState = {
    settings: SerializedSettings;
    view: SerializedView;
};

export const SERIALIZED_STATE: ModuleStateSchema<SerializedState> = {
    settings: SERIALIZED_SETTINGS,
    view: SERIALIZED_VIEW,
} as const;

export const serializeStateFunctions: ModuleComponentSerializationFunctions<SerializedState> = {
    serializeStateFunctions: {
        settings: serializeSettings,
        view: serializeView,
    },
    deserializeStateFunctions: {
        settings: deserializeSettings,
        view: deserializeView,
    },
};

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SERIALIZED_STATE, type SerializedState } from "./persistedState";
import type { InterfaceTypes } from "@modules/WellLogViewer/interfaces";

ModuleRegistry.registerModule<InterfaceTypes, SerializedState>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
    serializedStateDefinition: SERIALIZED_STATE,
});

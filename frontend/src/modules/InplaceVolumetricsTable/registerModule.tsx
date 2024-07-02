import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "InplaceVolumetricsTable";

ModuleRegistry.registerModule<State, Interface, Record<string, never>>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Table",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Inplace Volumetrics Table",
});

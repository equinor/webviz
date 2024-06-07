import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "InplaceVolumetricsTable";
ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Table",
});

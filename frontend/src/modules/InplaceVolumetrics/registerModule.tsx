import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "InplaceVolumetrics";

ModuleRegistry.registerModule<State, Interface, Record<string, never>>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Inplace Volumetrics",
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
});

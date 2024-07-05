import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { SettingsToViewInterface } from "./settingsToViewInterface";

export const MODULE_NAME = "InplaceVolumetricsConvergence";
const description = "Inplace Volumetrics Convergence";

ModuleRegistry.registerModule<Record<string, any>, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Convergence",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
});

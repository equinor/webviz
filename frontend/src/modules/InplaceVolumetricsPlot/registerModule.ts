import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";

export const MODULE_NAME = "InplaceVolumetricsPlot";
const description = "Inplace Volumetrics Plot";

ModuleRegistry.registerModule<Record<string, any>, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Plot",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
    channelDefinitions: channelDefs,
    preview,
});

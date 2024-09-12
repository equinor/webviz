import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumetricsPlot";
const description = "Inplace Volumetrics Plot";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Plot",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMETRICS],
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
    channelDefinitions: channelDefs,
    preview,
});

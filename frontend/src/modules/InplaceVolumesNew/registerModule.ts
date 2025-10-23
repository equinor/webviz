import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumesNew";
const description = "Inplace Volumes ";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumes (New)",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
    channelDefinitions: channelDefs,
    preview,
});

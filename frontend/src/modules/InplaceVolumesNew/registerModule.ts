import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";
export const MODULE_NAME = "InplaceVolumesNew";
const description = "Inplace Volumes (New)";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumes (New)",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
    channelDefinitions: channelDefs,
    preview,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "DynamicVolumes";

const description = "Analysis of dynamic volumes and recovery factors.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Dynamic Volumes",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES, ModuleDataTagId.SUMMARY],
    channelDefinitions: channelDefs,
    syncableSettingKeys: [SyncSettingKey.DATE],
    preview,
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";
// NOTE: The module name is part of the persisted session format and must not be changed.
export const MODULE_NAME = "InplaceVolumesNew";
const description =
    "Plots of inplace volumes: histogram, distribution, box, bar and convergence, with an optional statistics table.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumes Plot",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
    channelDefinitions: channelDefs,
    preview,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

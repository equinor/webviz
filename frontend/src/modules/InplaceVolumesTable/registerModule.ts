import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumesTable";
const description = "Inplace Volumes Table";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumes Table",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
    preview,
    serializedStateSchema: SERIALIZED_STATE,
});

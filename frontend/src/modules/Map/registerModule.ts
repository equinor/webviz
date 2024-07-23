import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

const description = "Plotting of surfaces in a 2D top view.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "Map",
    defaultTitle: "Map",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEPRECATED,
    dataTagIds: [ModuleDataTagId.SURFACE],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.SURFACE, SyncSettingKey.DATE],
    preview,
    description,
});

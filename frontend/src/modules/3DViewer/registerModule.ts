import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "3DViewer";

const description = "Generic 3D viewer for grid, surfaces, and wells.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "3D Viewer",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.GRID3D, ModuleDataTagId.DRILLED_WELLS],
    description,
    preview,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.INTERSECTION, SyncSettingKey.VERTICAL_SCALE],
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "Intersection";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Intersection",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Generic intersection viewer for co-visualization of intersection data from various sources.",
    preview,
    dataTagIds: [
        ModuleDataTagId.GRID3D,
        ModuleDataTagId.DRILLED_WELLS,
        ModuleDataTagId.POLYGONS,
        ModuleDataTagId.SURFACE,
        ModuleDataTagId.SEISMIC,
    ],
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.INTERSECTION,
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        SyncSettingKey.VERTICAL_SCALE,
    ],
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

import "./DataProviderFramework/registerAllDataProviders";

export const MODULE_NAME = "3DViewer";

const description = "Generic 3D viewer for grid, surfaces, and wells.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "3D Viewer",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description,
    preview,
    dataTagIds: [
        ModuleDataTagId.SURFACE,
        ModuleDataTagId.DRILLED_WELLS,
        ModuleDataTagId.SEISMIC,
        ModuleDataTagId.GRID3D,
        ModuleDataTagId.POLYGONS,
    ],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.INTERSECTION, SyncSettingKey.VERTICAL_SCALE],
    onInstanceUnload: (instanceId) => {
        window.localStorage.removeItem(`${instanceId}-settings`);
    },
});

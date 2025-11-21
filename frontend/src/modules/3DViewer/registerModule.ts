import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE, type SerializedState } from "./persistence";
import { preview } from "./preview";

import "./DataProviderFramework/registerAllDataProviders";

export const MODULE_NAME = "3DViewer";

const description = "Generic 3D viewer for reservoir grids, surfaces, seismic and wells.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "3D Viewer",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
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
    serializedStateSchema: SERIALIZED_STATE,
});

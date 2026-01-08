import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME: string = "2DViewer";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    defaultTitle: "2D Viewer",
    preview,
    description: "Generic 2D viewer for surfaces, reservoir grids and wells.",
    dataTagIds: [
        ModuleDataTagId.SURFACE,
        ModuleDataTagId.DRILLED_WELLS,
        ModuleDataTagId.SEISMIC,
        ModuleDataTagId.GRID3D,
        ModuleDataTagId.POLYGONS,
    ],
    serializedStateSchema: SERIALIZED_STATE,
});

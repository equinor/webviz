import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE, type SerializedState } from "./persistedState";
import { preview } from "./preview";

export const MODULE_NAME: string = "2DViewer";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    defaultTitle: "2D Viewer",
    preview,
    description: "Generic 2D viewer for co-visualization of spatial data.",
    dataTagIds: [
        ModuleDataTagId.SURFACE,
        ModuleDataTagId.DRILLED_WELLS,
        ModuleDataTagId.SEISMIC,
        ModuleDataTagId.GRID3D,
        ModuleDataTagId.POLYGONS,
    ],
    onInstanceUnload: (instanceId) => {
        window.localStorage.removeItem(`${instanceId}-settings`);
    },
    serializedStateSchema: SERIALIZED_STATE,
});

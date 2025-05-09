import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME: string = "3DViewerNew";

const description = "Generic 3D viewer for grid, surfaces, and wells.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    defaultTitle: "3D Viewer (new)",
    preview,
    description,
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
});

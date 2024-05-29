import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import state from "./state";

const description = "Generic 3D viewer for grid, surfaces, and wells.";

ModuleRegistry.registerModule<state>({
    moduleName: "Grid3D",
    defaultTitle: "3D grid",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEPRECATED,
    dataTagIds: [ModuleDataTagId.GRID3D, ModuleDataTagId.DRILLED_WELLS],
    description,
    preview,
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

export const MODULE_NAME: string = "2DViewer";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    defaultTitle: "2D Viewer",
});

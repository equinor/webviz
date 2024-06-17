import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

export const MODULE_NAME = "StructuralUncertaintyIntersection";

ModuleRegistry.registerModule<State>({
    moduleName: MODULE_NAME,
    defaultTitle: "Structural Uncertainty Intersection",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Structural Uncertainty Intersection",
    // preview,
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.INTERSECTION,
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        SyncSettingKey.VERTICAL_SCALE,
    ],
});

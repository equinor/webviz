import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";

const description = "Visualization of structural uncertainty in an intersection";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "StructuralUncertaintyIntersection",
    defaultTitle: "Structural Uncertainty Intersection",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.SURFACE, ModuleDataTagId.DRILLED_WELLS],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    description,
});

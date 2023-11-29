import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "StructuralUncertaintyIntersection",
    defaultTitle: "Structural Uncertainty Intersection",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    description: "Visualization of structural uncertainty in an intersection",
});

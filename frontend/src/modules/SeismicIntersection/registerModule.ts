import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SeismicIntersection",
    defaultTitle: "Seismic Intersection",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    description: "Visualization of intersection data with a wellbore and seismic fence",
});

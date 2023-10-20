import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

// import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SeismicIntersection",
    defaultTitle: "Seismic Intersection",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    // preview,
    description: "Visualization fence of seismic intersection data with a wellbore",
});

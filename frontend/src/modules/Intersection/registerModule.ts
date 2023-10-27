import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

// import { preview } from "./preview";
import { State } from "./state";

// TODO: Add preview?
ModuleRegistry.registerModule<State>({
    moduleName: "Intersection",
    defaultTitle: "Intersection",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    description: "Visualization of intersection data with a wellbore",
});

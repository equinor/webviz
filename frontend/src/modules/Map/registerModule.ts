import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { MapState } from "./MapState";

ModuleRegistry.registerModule<MapState>({
    moduleName: "Map",
    defaultTitle: "Map",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.SURFACE, SyncSettingKey.DATE],
});

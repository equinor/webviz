import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { MapState } from "./MapState";

ModuleRegistry.registerModule<MapState>({
    moduleName: "Map",
    defaultTitle: "Map",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.SURFACE, SyncSettingKey.DATE],
    preview
});

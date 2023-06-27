import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { MapState } from "./MapState";

ModuleRegistry.registerModule<MapState>("Map", "Map", [
    SyncSettingKey.ENSEMBLE,
    SyncSettingKey.SURFACE,
    SyncSettingKey.DATE,
]);

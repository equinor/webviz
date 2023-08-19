import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { state } from "./state";

ModuleRegistry.registerModule<state>({
    moduleName: "TopographicMap",
    defaultTitle: "Topographic Map",
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.SURFACE,
        SyncSettingKey.CAMERA_POSITION_MAP,
        SyncSettingKey.WELLBORE,
    ],
});

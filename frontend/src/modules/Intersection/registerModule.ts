import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { state } from "./state";

ModuleRegistry.registerModule<state>({
    moduleName: "Intersection",
    defaultTitle: "Intersection",
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.WELLBORE,
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
    ],
});

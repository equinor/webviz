import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { state } from "./state";

const description = "Visualizes surfaces in a 3D view.";

ModuleRegistry.registerModule<state>({
    moduleName: "SubsurfaceMap",
    defaultTitle: "Subsurface Map",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEPRECATED,
    dataTagIds: [ModuleDataTagId.SURFACE],
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.SURFACE,
        SyncSettingKey.CAMERA_POSITION_MAP,
        SyncSettingKey.WELLBORE,
    ],
    description,
});

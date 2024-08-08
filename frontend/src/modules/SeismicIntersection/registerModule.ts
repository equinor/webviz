import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";

const description = "Visualization of intersection data with a wellbore and seismic fence.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "SeismicIntersection",
    defaultTitle: "Seismic Intersection",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEPRECATED,
    dataTagIds: [ModuleDataTagId.SEISMIC, ModuleDataTagId.DRILLED_WELLS],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE],
    description,
});

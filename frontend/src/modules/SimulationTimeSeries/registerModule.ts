import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "SimulationTimeSeries";

const description = "Plotting of simulation time series data.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Simulation Time Series",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.OBSERVATIONS],
    syncableSettingKeys: [SyncSettingKey.PARAMETER],
    preview,
    channelDefinitions: channelDefs,
    description,
});

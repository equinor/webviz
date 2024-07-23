import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";
import { Interfaces } from "@modules/3DViewer/interfaces";

import { channelDefs } from "./channelDefs";

const description = "Plotting of simulation time series data for ensembles with design matrices.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "SimulationTimeSeriesSensitivity",
    defaultTitle: "Simulation time series per sensitivity",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.SUMMARY],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channelDefinitions: channelDefs,
    description,
});

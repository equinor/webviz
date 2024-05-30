import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
// import { SyncSettingKey } from "@framework/SyncSettings";
// import { broadcastChannelsDef } from "./channelDefs";
import { preview } from "./preview";
import { State } from "./state";

const description = "Plotting of simulation time series data.";

ModuleRegistry.registerModule<State>({
    moduleName: "SimulationTimeSeriesMatrix",
    defaultTitle: "Simulation Time Series Matrix",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEPRECATED,
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.OBSERVATIONS],
    // syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    preview,
    channelDefinitions: channelDefs,
    description,
});

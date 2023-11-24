import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SimulationTimeSeriesSensitivity",
    defaultTitle: "Simulation time series per sensitivity",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channels: channelDefs,
});

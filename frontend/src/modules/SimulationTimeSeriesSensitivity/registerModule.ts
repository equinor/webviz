import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { broadcastChannelsDef } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>(
    "SimulationTimeSeriesSensitivity",
    "Simulation time series sensitivity",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    broadcastChannelsDef
);

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { BroadcastChannelNames, BroadcastChannelTypes, broadcastChannelDefs } from "./broadcastChannel";
import { State } from "./state";

ModuleRegistry.registerModule<State, BroadcastChannelNames, BroadcastChannelTypes>(
    "SimulationTimeSeries",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    broadcastChannelDefs
);

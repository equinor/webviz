import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
// import { SyncSettingKey } from "@framework/SyncSettings";
// import { broadcastChannelsDef } from "./channelDefs";
import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SimulationTimeSeriesMatrixDev",
    defaultTitle: "Simulation Time Series Matrix (dev)",
    preview,
    channelDefinitions: channelDefs,
});

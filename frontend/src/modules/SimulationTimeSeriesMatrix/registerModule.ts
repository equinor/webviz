import { ModuleRegistry } from "@framework/ModuleRegistry";

// import { SyncSettingKey } from "@framework/SyncSettings";
// import { broadcastChannelsDef } from "./channelDefs";
import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SimulationTimeSeriesMatrix",
    defaultTitle: "Simulation Time Series Matrix",
    // syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    // broadcastChannelsDef,
    preview,
});

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
// import { SyncSettingKey } from "@framework/SyncSettings";
// import { broadcastChannelsDef } from "./channelDefs";
import { preview } from "./preview";

ModuleRegistry.registerModule<never>({
    moduleName: "SimulationTimeSeries",
    defaultTitle: "Simulation Time Series",
    preview,
    channelDefinitions: channelDefs,
});

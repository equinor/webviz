import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "SimulationTimeSeries";

const description = "Plotting of simulation time series data.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Simulation Time Series",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.OBSERVATIONS],
    preview,
    channelDefinitions: channelDefs,
    description,
});

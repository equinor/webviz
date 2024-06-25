import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { preview } from "./preview";
import { SettingsAtoms } from "./settings/atoms/atomDefinitions";
import { Interface } from "./settingsToViewInterface";
import { State } from "./state";
import { ViewAtoms } from "./view/atoms/atomDefinitions";

export const MODULE_NAME = "SimulationTimeSeries";

const description = "Plotting of simulation time series data.";

ModuleRegistry.registerModule<State, Interface, SettingsAtoms, ViewAtoms>({
    moduleName: MODULE_NAME,
    defaultTitle: "Simulation Time Series",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.OBSERVATIONS],
    preview,
    channelDefinitions: channelDefs,
    description,
});

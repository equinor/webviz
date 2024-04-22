import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsAtoms, ViewAtoms } from "./atomDefinitions";
import { channelDefs } from "./channelDefs";
import { preview } from "./preview";
import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "SimulationTimeSeries";

ModuleRegistry.registerModule<State, Interface, SettingsAtoms, ViewAtoms>({
    moduleName: MODULE_NAME,
    defaultTitle: "Simulation Time Series",
    preview,
    channelDefinitions: channelDefs,
});

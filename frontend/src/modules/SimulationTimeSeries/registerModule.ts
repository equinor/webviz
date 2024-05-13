import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { preview } from "./preview";
import { SettingsAtoms } from "./settings/atoms/atomDefinitions";
import { Interface } from "./settingsToViewInterface";
import { State } from "./state";
import { ViewAtoms } from "./view/atoms/atomDefinitions";

export const MODULE_NAME = "SimulationTimeSeries";

ModuleRegistry.registerModule<State, Interface, SettingsAtoms, ViewAtoms>({
    moduleName: MODULE_NAME,
    defaultTitle: "Simulation Time Series",
    preview,
    channelDefinitions: channelDefs,
});

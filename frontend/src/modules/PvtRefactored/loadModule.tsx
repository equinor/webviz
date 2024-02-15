import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    pvtVisualizations: ["volumefactor", "viscosity", "density", "ratio"],
    pvtNum: 1,
    pvtName: "Oil (PVTO)",
    groupBy: "ENSEMBLE",
    realization: 0,
    activeDataSet: null,
};

const module = ModuleRegistry.initModule<State>("PvtRefactored", defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;

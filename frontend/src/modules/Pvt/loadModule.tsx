import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import state from "./state";
import { View } from "./view";

const defaultState: state = {
    pvtVisualizations: ["volumefactor", "viscosity", "density", "ratio"],
    pvtNum: 1,
    pvtName: "Oil (PVTO)",
    groupBy: "ENSEMBLE",
    realization: 0,
    activeDataSet: null,
};

const module = ModuleRegistry.initModule<state>("Pvt", defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;

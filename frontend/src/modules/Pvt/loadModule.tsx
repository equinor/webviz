import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import state from "./state";
import { view } from "./view";

const defaultState: state = {
    pvtVisualizations: ["volumefactor", "viscosity", "density", "ratio"],
    pvtNum: 1,
    pvtName: "Oil (PVTO)",
    groupBy: "ENSEMBLE",
    realization: 0,
    activeDataSet: null

};

const module = ModuleRegistry.initModule<state>("Pvt", defaultState, {

});

module.viewFC = view;
module.settingsFC = settings;

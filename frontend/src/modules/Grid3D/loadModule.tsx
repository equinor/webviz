import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import state from "./state";
import { view } from "./view";

const initialState: state = {
    gridName: "Geogrid",
    parameterName: "PHIT",
    realizations: ["0"],
    useStatistics: false,

};

const module = ModuleRegistry.initModule<state>("Grid3D", initialState, {

});

module.viewFC = view;
module.settingsFC = settings;

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import state from "./state";
import { view } from "./view";

const initialState: state = {
    gridName: "Geogrid_static",
    parameterName: "PHIT",
    realizations: ["0"],
    useStatistics: false,

};

const module = ModuleRegistry.initModule<state>("Grid3DIntersection", initialState, {

});

module.viewFC = view;
module.settingsFC = settings;

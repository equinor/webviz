import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import state from "./state";
import { view } from "./view";

const defaultState: state = {
    gridName: "Simgrid",
    parameterName: "PORO",
    realizations: ["1"],
    useStatistics: false,

};

const module = ModuleRegistry.initModule<state>("Grid3D", defaultState, {

});

module.viewFC = view;
module.settingsFC = settings;

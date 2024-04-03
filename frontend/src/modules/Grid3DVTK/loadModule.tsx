import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import state from "./state";
import { View } from "./view";

const defaultState: state = {
    gridName: "Simgrid",
    parameterName: "PORO",
    selectedWellUuids: [],
    realizations: ["1"],
    useStatistics: false,
};

const module = ModuleRegistry.initModule<state>("Grid3DVTK", defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;

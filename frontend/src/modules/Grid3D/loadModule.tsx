import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import state from "./state";
import { View } from "./view";

const defaultState: state = {
    gridName: null,
    boundingBox: null,
    parameterName: null,
    selectedWellUuids: [],
    showGridLines: false,
    realization: 0,
    singleKLayer: -1,
    polyLine: [],
};

const module = ModuleRegistry.initModule<state>("Grid3D", defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;

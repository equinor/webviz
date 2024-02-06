import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State, WellborePickSelectionType } from "./state";
import { View } from "./view";

const defaultState: State = {
    wellboreAddress: null,
    seismicAddress: null,
    surfaceAddress: null,
    wellborePickCaseUuid: null,
    wellborePickSelection: WellborePickSelectionType.NONE,
    extension: 1000,
    zScale: 5,
};

const module = ModuleRegistry.initModule<State>("SeismicIntersection", defaultState);

module.viewFC = View;
module.settingsFC = Settings;

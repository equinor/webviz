import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    wellboreAddress: null,
    seismicAddress: null,
    extension: 1000,
    zScale: 5,
};

const module = ModuleRegistry.initModule<State>("SeismicIntersection", defaultState);

module.viewFC = view;
module.settingsFC = settings;

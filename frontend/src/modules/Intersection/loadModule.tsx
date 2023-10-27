import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    wellboreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    seismicAddress: null,
    extension: 1000,
    zScale: 5,
};

const module = ModuleRegistry.initModule<State>("Intersection", defaultState);

module.viewFC = view;
module.settingsFC = settings;

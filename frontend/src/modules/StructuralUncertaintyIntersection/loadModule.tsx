import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    wellboreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    surfaceSetSpec: null,
    extension: 1000,
    zScale: 5,
};

const module = ModuleRegistry.initModule<State>("StructuralUncertaintyIntersection", defaultState);

module.viewFC = view;
module.settingsFC = settings;

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    wellBoreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    seismicAddress: null,
    // viewSettings: {
    //     showGridParameter: false,
    //     showSeismic: true,
    //     showSurfaces: true,
    //     showWellMarkers: true,
    //     extension: 1000,
    //     zScale: 5,
    // },
};

const module = ModuleRegistry.initModule<State>("SeismicIntersection", defaultState);

module.viewFC = view;
module.settingsFC = settings;

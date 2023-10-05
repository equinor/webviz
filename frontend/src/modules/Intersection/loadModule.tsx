import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { state } from "./state";
import { view } from "./view";

const defaultState: state = {
    wellBoreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    surfaceAddress: null,
    viewSettings: {
        showGridParameter: false,
        showSeismic: true,
        showSurfaces: true,
        showWellMarkers: true,
        extension: 1000,
        zScale: 5,
    },
};

const module = ModuleRegistry.initModule<state>("Intersection", defaultState);

module.viewFC = view;
module.settingsFC = settings;

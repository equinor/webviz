import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { state } from "./state";
import { view } from "./view";

const initialState: state = {
    selectedSurface: null,
    selectedSeismicCube: null,
    show3D: true,
};

const module = ModuleRegistry.initModule<state>("SeismicSurfaceAttributes", initialState, {
    selectedSurface: { deepCompare: true },
    selectedSeismicCube: { deepCompare: true },
});

module.viewFC = view;
module.settingsFC = settings;

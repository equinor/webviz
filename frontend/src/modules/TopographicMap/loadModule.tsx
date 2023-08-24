import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { state } from "./state";
import { view } from "./view";

const defaultState: state = {
    meshSurfaceAddress: null,
    propertySurfaceAddress: null,
    polygonsAddress: null,
    selectedWellUuids: [],
    surfaceSettings: null,
    viewSettings: null,
};

const module = ModuleRegistry.initModule<state>("TopographicMap", defaultState, {
    meshSurfaceAddress: { deepCompare: true },
    propertySurfaceAddress: { deepCompare: true },
    polygonsAddress: { deepCompare: true },
    surfaceSettings: { deepCompare: true },
});

module.viewFC = view;
module.settingsFC = settings;

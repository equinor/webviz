import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { state } from "./state";
import { View } from "./view";

const defaultState: state = {
    meshSurfaceAddress: null,
    propertySurfaceAddress: null,
    polygonsAddress: null,
    selectedWellUuids: [],
    surfaceSettings: null,
    viewSettings: null,
};

const module = ModuleRegistry.initModule<state>("SubsurfaceMap", defaultState, {
    meshSurfaceAddress: { deepCompare: true },
    propertySurfaceAddress: { deepCompare: true },
    polygonsAddress: { deepCompare: true },
    surfaceSettings: { deepCompare: true },
});

module.viewFC = View;
module.settingsFC = Settings;

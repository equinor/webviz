import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MapSettings } from "./MapSettings";
import { MapState } from "./MapState";
import { MapView } from "./MapView";

const defaultState: MapState = {
    surfaceAddress: null,
};

const module = ModuleRegistry.initModule<MapState>("Map", defaultState, {
    surfaceAddress: { deepCompare: true },
});

module.viewFC = MapView;
module.settingsFC = MapSettings;

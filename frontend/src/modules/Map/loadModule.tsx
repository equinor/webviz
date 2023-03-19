import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MapSettings } from "./MapSettings";
import { MapState } from "./MapState";
import { MapView } from "./MapView";

const initialState: MapState = {
    surfaceAddress: null,
};

const module = ModuleRegistry.initModule<MapState>("Map", initialState, {
    surfaceAddress: { deepCompare: true },
});

module.viewFC = MapView;
module.settingsFC = MapSettings;

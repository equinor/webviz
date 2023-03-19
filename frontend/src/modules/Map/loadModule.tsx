import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SigSurfaceSettings } from "./sigSurfaceSettings";
import { SigSurfaceState } from "./sigSurfaceState";
import { SigSurfaceView } from "./sigSurfaceView";

const initialState: SigSurfaceState = {
    surfaceAddress: null,
};

const module = ModuleRegistry.initModule<SigSurfaceState>("Map", initialState, {
    surfaceAddress: { deepCompare: true },
});

module.viewFC = SigSurfaceView;
module.settingsFC = SigSurfaceSettings;

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SigSurfaceSettings } from "./sigSurfaceSettings";
import { SigSurfaceState } from "./sigSurfaceState";
import { SigSurfaceView } from "./sigSurfaceView";

const initialState: SigSurfaceState = {
    surfaceType: "dynamic",
    ensembleName: null,
    surfaceName: null,
    surfaceAttribute: null,
    realizationNum: 0,
    timeOrInterval: null,
    aggregation: null
};

const module = ModuleRegistry.initModule<SigSurfaceState>("SigSurfaceModule", initialState);

module.viewFC = SigSurfaceView;
module.settingsFC = SigSurfaceSettings;

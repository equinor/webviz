import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SigSurfaceSettings } from "./sigSurfaceSettings";
import { SigSurfaceState } from "./sigSurfaceState";
import { SigSurfaceView } from "./sigSurfaceView";

const initialState: SigSurfaceState = {
    ensembleName: null,
};

const module = ModuleRegistry.initModule<SigSurfaceState>("SigSurfaceModule", initialState);

module.viewFC = SigSurfaceView;
module.settingsFC = SigSurfaceSettings;

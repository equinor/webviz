import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import state from "./state";

ModuleRegistry.registerModule<state>({ moduleName: "Grid3DVTK", defaultTitle: "3D grid (VTK)", preview });

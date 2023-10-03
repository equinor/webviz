import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import state from "./state";

ModuleRegistry.registerModule<state>({ moduleName: "Grid3DIntersection", defaultTitle: "3D grid intersection", preview });

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import state from "./state";

ModuleRegistry.registerModule<state>({ moduleName: "Grid3DIntersection", defaultTitle: "3D grid intersection" });

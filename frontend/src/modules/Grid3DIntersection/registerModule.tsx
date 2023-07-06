import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import state from "./state";

ModuleRegistry.registerModule<state>("Grid3DIntersection", "3D grid intersection");

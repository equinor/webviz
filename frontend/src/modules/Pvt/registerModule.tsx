import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import state from "./state";

ModuleRegistry.registerModule<state>({ moduleName: "Pvt", defaultTitle: "PVT", preview });

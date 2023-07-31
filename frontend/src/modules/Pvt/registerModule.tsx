import { ModuleRegistry } from "@framework/ModuleRegistry";

import state from "./state";

ModuleRegistry.registerModule<state>({ moduleName: "Pvt", defaultTitle: "PVT" });

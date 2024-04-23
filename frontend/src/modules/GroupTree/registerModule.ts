import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({ moduleName: "GroupTree", defaultTitle: "GroupTree", preview });

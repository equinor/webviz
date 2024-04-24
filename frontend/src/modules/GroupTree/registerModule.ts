import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./settingsToViewInterface";

export const MODULE_NAME = "GroupTree";
ModuleRegistry.registerModule<State, Interface>({ moduleName: MODULE_NAME, defaultTitle: "GroupTree", preview });

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./state";

export const MODULE_NAME = "Pvt";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "PVT",
    preview,
});

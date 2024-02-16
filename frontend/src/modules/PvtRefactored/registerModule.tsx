import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./state";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: "PvtRefactored",
    defaultTitle: "PVT (refactored)",
    preview,
});

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    description: "My module description",
});

ModuleRegistry.registerModule<State>({ moduleName: "MyModule", defaultTitle: "My Module" });

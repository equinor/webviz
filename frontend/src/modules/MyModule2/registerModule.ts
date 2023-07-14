import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>({ moduleName: "MyModule2", defaultTitle: "My Module 2" });

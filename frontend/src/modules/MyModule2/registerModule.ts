import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface, State } from "./state";

ModuleRegistry.registerModule<State, Interface>({ moduleName: "MyModule2", defaultTitle: "My Module 2" });

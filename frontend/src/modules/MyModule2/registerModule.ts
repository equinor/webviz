import { ModuleRegistry } from "@framework/ModuleRegistry";

import { atoms } from "./atoms";
import { State } from "./state";

ModuleRegistry.registerModule<State>({ moduleName: "MyModule2", defaultTitle: "My Module 2", atoms: atoms });

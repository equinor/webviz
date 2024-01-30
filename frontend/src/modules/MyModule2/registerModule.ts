import { ModuleRegistry } from "@framework/ModuleRegistry";

import { atomDefinitions } from "./atoms";
import { State } from "./state";

ModuleRegistry.registerModule<State>({ moduleName: "MyModule2", defaultTitle: "My Module 2", atoms: atomDefinitions });

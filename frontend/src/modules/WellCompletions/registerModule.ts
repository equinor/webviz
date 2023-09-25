import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>({ moduleName: "WellCompletions", defaultTitle: "Well Completions" });

import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "ParameterDistributionMatrix",
    defaultTitle: "Parameter Distribution Matrix",
});

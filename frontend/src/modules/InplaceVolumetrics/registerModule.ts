import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "InplaceVolumetrics",
    defaultTitle: "Inplace volumetrics",
    channelDefinitions: channelDefs,
});

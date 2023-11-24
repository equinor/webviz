import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channels } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "InplaceVolumetricsNew",
    defaultTitle: "Inplace Volumetrics (new)",
    description: "A module for comparing and investigating responses.",
    channels: channels,
});

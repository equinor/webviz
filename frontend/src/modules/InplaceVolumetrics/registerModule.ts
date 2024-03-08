import { ModuleRegistry } from "@framework/ModuleRegistry";

// import { channelDefs } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "InplaceVolumetrics",
    defaultTitle: "Inplace Volumetrics",
    description: "A module for comparing and investigating responses.",
    // channels: channelDefs,
});

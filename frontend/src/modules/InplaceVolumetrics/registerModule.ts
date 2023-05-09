import { ModuleRegistry } from "@framework/ModuleRegistry";

import { BroadcastChannelNames, BroadcastChannelTypes, broadcastChannelDefs } from "./broadcastChannel";
import { State } from "./state";

ModuleRegistry.registerModule<State, BroadcastChannelNames, BroadcastChannelTypes>(
    "InplaceVolumetrics",
    [],
    broadcastChannelDefs
);

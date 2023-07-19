import { BroadcastChannelKeyCategory, BroadcastChannelValueType, BroadcastChannelsDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

const broadcastChannelsDef: BroadcastChannelsDef = {
    Test: {
        key: BroadcastChannelKeyCategory.TimestampMs,
        value: BroadcastChannelValueType.Numeric,
    },
};

ModuleRegistry.registerModule<State>({ moduleName: "MyModule", defaultTitle: "My Module", broadcastChannelsDef });

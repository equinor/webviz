import { BroadcastChannelInputDef, BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

const inputChannels: BroadcastChannelInputDef[] = [
    {
        name: "response",
        displayName: "Realization response",
        keyCategories: [BroadcastChannelKeyCategory.Realization],
    },
];

ModuleRegistry.registerModule<State>(
    "Sensitivity",
    "Sensitivity",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    undefined,
    inputChannels
);

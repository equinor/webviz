import { BroadcastChannelKeyCategory, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

const inputChannelDefs: InputBroadcastChannelDef[] = [
    {
        name: "response",
        displayName: "Realization response",
        keyCategories: [BroadcastChannelKeyCategory.Realization],
    },
];

ModuleRegistry.registerModule<State>("Sensitivity", "Sensitivity", {
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    inputChannelDefs,
});

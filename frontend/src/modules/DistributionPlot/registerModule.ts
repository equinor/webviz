import { BroadcastChannelKeyCategory, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const inputChannelDefs: InputBroadcastChannelDef[] = [
    {
        name: "channelX",
        displayName: "X axis",
        keyCategories: [BroadcastChannelKeyCategory.Realization],
    },
    {
        name: "channelY",
        displayName: "Y axis",
        keyCategories: [BroadcastChannelKeyCategory.Realization],
    },
    {
        name: "channelColor",
        displayName: "Color mapping",
        keyCategories: [BroadcastChannelKeyCategory.Realization],
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "DistributionPlot",
    defaultTitle: "Distribution plot",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    inputChannelDefs,
    preview,
});

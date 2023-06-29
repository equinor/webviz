import { BroadcastChannelInputDef, BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

const channelInputs: BroadcastChannelInputDef[] = [
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

ModuleRegistry.registerModule<State>(
    "DistributionPlot",
    "Distribution plot",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    undefined,
    channelInputs
);

import { Genre, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const inputChannelDefs: InputBroadcastChannelDef[] = [
    {
        name: "channelX",
        displayName: "X axis",
        keyCategories: [Genre.Realization],
    },
    {
        name: "channelY",
        displayName: "Y axis",
        keyCategories: [Genre.Realization],
    },
    {
        name: "channelColor",
        displayName: "Color mapping",
        keyCategories: [Genre.Realization],
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "DistributionPlot",
    defaultTitle: "Distribution plot",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    inputChannelDefs,
    preview,
});

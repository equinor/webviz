import { BroadcastChannelKeyCategory, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ChannelListener, Genre } from "@framework/NewBroadcaster";
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

const channelListeners: ChannelListener[] = [
    {
        ident: "channelX",
        name: "X axis",
        supportedGenres: [Genre.Realization],
    },
    {
        ident: "channelY",
        name: "Y axis",
        supportedGenres: [Genre.Realization],
    },
    {
        ident: "channelColor",
        name: "Color mapping",
        supportedGenres: [Genre.Realization],
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "DistributionPlot",
    defaultTitle: "Distribution plot",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    inputChannels: inputChannelDefs,
    channelListeners: channelListeners,
    preview,
});

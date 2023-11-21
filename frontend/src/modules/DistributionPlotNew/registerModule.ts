import { BroadcastChannelKeyCategory, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ChannelListener, Genre } from "@framework/NewBroadcaster";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const channelListeners: ChannelListener[] = [
    {
        ident: "channelX",
        name: "X axis",
        supportedGenres: [Genre.Realization],
        multiTasking: true,
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
    moduleName: "DistributionPlotNew",
    defaultTitle: "Distribution plot (new)",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channelListeners: channelListeners,
    preview,
});

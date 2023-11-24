import { Genre, SubscriberDefinition } from "@framework/DataChannelTypes";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const subscribers: SubscriberDefinition[] = [
    {
        ident: "channelX",
        name: "X axis",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "channelY",
        name: "Y axis",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "channelColor",
        name: "Color mapping",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "singleTaskingListener",
        name: "Single tasking listener",
        supportedGenres: [Genre.Realization],
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "DistributionPlot",
    defaultTitle: "Distribution plot",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    subscribers: subscribers,
    preview,
});

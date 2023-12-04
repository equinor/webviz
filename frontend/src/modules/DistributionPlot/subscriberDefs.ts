import { Genre, SubscriberDefinition } from "@framework/DataChannelTypes";

export const subscriberDefs: SubscriberDefinition[] = [
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
        ident: "channelZ",
        name: "Z axis",
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

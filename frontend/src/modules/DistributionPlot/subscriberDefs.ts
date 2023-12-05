import { KeyKind, SubscriberDefinition } from "@framework/DataChannelTypes";

export const subscriberDefs: SubscriberDefinition[] = [
    {
        ident: "channelX",
        name: "X axis",
        supportedGenres: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "channelY",
        name: "Y axis",
        supportedGenres: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "channelZ",
        name: "Z axis",
        supportedGenres: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "channelColor",
        name: "Color mapping",
        supportedGenres: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        ident: "singleTaskingListener",
        name: "Single tasking listener",
        supportedGenres: [KeyKind.Realization],
    },
];

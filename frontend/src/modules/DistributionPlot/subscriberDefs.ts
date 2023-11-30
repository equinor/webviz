import { Genre, SubscriberDefinitions } from "@framework/DataChannelTypes";

export const subscriberDefs = {
    ["channelX"]: {
        name: "X axis",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    ["channelY"]: {
        name: "Y axis",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    ["channelZ"]: {
        name: "Z axis",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    ["channelColor"]: {
        name: "Color mapping",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: true,
    },
    ["singleTaskingListener"]: {
        name: "Single tasking listener",
        supportedGenres: [Genre.Realization],
    },
} as const;

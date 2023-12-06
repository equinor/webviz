import { KeyKind, ModuleChannelReceiverDefinition } from "@framework/DataChannelTypes";

export const subscriberDefs: ModuleChannelReceiverDefinition[] = [
    {
        idString: "channelX",
        displayName: "X axis",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        idString: "channelY",
        displayName: "Y axis",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        idString: "channelZ",
        displayName: "Z axis",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        idString: "channelColor",
        displayName: "Color mapping",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: true,
    },
    {
        idString: "singleTaskingListener",
        displayName: "Single tasking listener",
        supportedKindsOfKeys: [KeyKind.Realization],
    },
];

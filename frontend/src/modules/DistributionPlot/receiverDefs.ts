import { KeyKind, ModuleChannelReceiverDefinition } from "@framework/DataChannelTypes";

export const receiverDefs: ModuleChannelReceiverDefinition[] = [
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
        idString: "channelColorMapping",
        displayName: "Color mapping",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: false,
    },
];

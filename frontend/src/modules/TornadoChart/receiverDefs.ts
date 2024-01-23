import { ChannelReceiverDefinition, KeyKind } from "@framework/DataChannelTypes";

export const receiverDefs: ChannelReceiverDefinition[] = [
    {
        idString: "response",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: false,
    },
];

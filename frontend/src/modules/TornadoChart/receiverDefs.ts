import { KeyKind, ModuleChannelReceiverDefinition } from "@framework/DataChannelTypes";

export const receiverDefs: ModuleChannelReceiverDefinition[] = [
    {
        idString: "response",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: false,
    },
];

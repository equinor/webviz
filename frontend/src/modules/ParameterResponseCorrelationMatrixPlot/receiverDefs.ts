import type { ChannelReceiverDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export const receiverDefs: ChannelReceiverDefinition[] = [
    {
        idString: "channelResponse",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: true,
    },
    {
        idString: "channelResponse2",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: true,
    },
    {
        idString: "channelResponse3",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: true,
    },
];

import type { ChannelReceiverDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export const receiverDefs: ChannelReceiverDefinition[] = [
    {
        idString: "response",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: false,
    },
];

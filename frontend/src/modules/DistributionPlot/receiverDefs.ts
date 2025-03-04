import type { ChannelReceiverDefinition} from "@framework/DataChannelTypes";
import { KeyKind } from "@framework/DataChannelTypes";

export const receiverDefs: ChannelReceiverDefinition[] = [
    {
        idString: "channelX",
        displayName: "X axis",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: true,
    },
    {
        idString: "channelY",
        displayName: "Y axis",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: true,
    },
    {
        idString: "channelColorMapping",
        displayName: "Color mapping",
        supportedKindsOfKeys: [KeyKind.REALIZATION],
        supportsMultiContents: false,
    },
];

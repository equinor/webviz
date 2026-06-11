import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    RESPONSE_AT_DEPTH = "Response value (per realization at selected depth)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.RESPONSE_AT_DEPTH,
        displayName: "RFT response at selected depth (per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];

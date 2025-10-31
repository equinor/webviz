import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    REALIZATION_VALUE = "Value (per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.REALIZATION_VALUE,
        displayName: "Value (per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];

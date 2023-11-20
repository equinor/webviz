import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";
import { Channel, ContentType, Genre } from "@framework/NewBroadcaster";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Realization_Value]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
};

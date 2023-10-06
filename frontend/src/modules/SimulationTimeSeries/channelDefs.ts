import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
    Realization_Value_TEST = "Value (per realization) TEST",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Realization_Value]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
};

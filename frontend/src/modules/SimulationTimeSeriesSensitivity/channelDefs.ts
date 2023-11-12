import { Genre, GenreContent } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Realization_Value]: {
        key: Genre.Realization,
        value: GenreContent.Numeric,
    },
};

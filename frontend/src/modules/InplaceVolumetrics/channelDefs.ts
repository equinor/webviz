import { Genre, GenreContent } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        key: Genre.Realization,
        value: GenreContent.Numeric,
    },
};

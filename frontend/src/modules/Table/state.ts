export type State = {
    indexColumnChannel: string;
    columnChannels: string[];
};

export const initialState: State = {
    indexColumnChannel: "",
    columnChannels: [],
};

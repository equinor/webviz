export const SERIALIZED_STATE = {
    myData: {
        type: "string",
    },
} as const;

export type SerializedState = typeof SERIALIZED_STATE;

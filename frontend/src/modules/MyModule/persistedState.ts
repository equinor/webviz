export const SERIALIZED_STATE = {
    settings: {
        properties: {
            myData: {
                type: "string",
            },
        },
    },
    view: {},
} as const;

export type SerializedState = typeof SERIALIZED_STATE;

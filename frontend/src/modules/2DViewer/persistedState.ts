export const SERIALIZED_STATE = {
    settings: {
        properties: {
            dataProviderData: {
                type: "string",
            },
        },
    },
    view: {},
} as const;

export type SerializedState = typeof SERIALIZED_STATE;

import type { JTDSchemaType } from "ajv/dist/core";

export type SerializedState = {
    settings: {
        myData: string;
    };
};

export const SERIALIZED_STATE: JTDSchemaType<SerializedState> = {
    properties: {
        settings: {
            properties: {
                myData: {
                    type: "string",
                },
            },
        },
    },
} as const;

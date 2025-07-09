import type { ModuleStateSchema } from "@framework/Module";

export type SerializedState = {
    settings: {
        myData: string;
    };
};

export const SERIALIZED_STATE: ModuleStateSchema<SerializedState> = {
    settings: {
        properties: {
            myData: {
                type: "string",
            },
        },
    },
} as const;

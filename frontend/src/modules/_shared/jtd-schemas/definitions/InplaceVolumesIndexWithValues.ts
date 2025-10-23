import type { JTDSchemaType } from "ajv/dist/core";

export type InplaceVolumesIndexWithValuesAsStrings = {
    indexColumn: string;
    values: string[];
};

export const InplaceVolumesIndexWithValuesAsStringsSchema: JTDSchemaType<InplaceVolumesIndexWithValuesAsStrings[]> = {
    elements: {
        properties: {
            indexColumn: { type: "string" },
            values: {
                elements: { type: "string" },
            },
        },
    },
} as const;

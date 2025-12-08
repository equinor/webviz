import type { JTDSchemaType } from "ajv/dist/core";

export type InplaceVolumesIndexWithValuesAsStrings = {
    indexColumn: string;
    values: string[];
};

export const INPLACE_VOLUMES_INDEX_WITH_VALUES_SCHEMA: JTDSchemaType<InplaceVolumesIndexWithValuesAsStrings[]> = {
    elements: {
        properties: {
            indexColumn: { type: "string" },
            values: {
                elements: { type: "string" },
            },
        },
    },
} as const;

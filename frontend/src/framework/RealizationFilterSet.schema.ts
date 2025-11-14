import type { JTDSchemaType } from "ajv/dist/jtd";

import { REALIZATION_FILTER_STATE_SCHEMA, type SerializedRealizationFilterState } from "./RealizationFilter.schema";

export type SerializedRealizationFilterSetState = Array<{
    ensembleIdentString: string;
    realizationFilter: SerializedRealizationFilterState;
}>;

export const REALIZATION_FILTER_SET_STATE_SCHEMA: JTDSchemaType<SerializedRealizationFilterSetState> = {
    elements: {
        properties: {
            ensembleIdentString: { type: "string" },
            realizationFilter: REALIZATION_FILTER_STATE_SCHEMA,
        },
    },
} as const;

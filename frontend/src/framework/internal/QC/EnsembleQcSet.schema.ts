import type { JTDSchemaType } from "ajv/dist/jtd";

import { ENSEMBLE_QC_STATE_SCHEMA, type SerializedEnsembleQcState } from "./EnsembleQc.schema";
import { SerializedRealizationFilterSetState } from "@framework/RealizationFilterSet.schema";
import { REALIZATION_FILTER_STATE_SCHEMA } from "@framework/RealizationFilter.schema";

export type SerializedEnsembleQcSetState = Array<{
    ensembleIdentString: string;
    ensembleQc: SerializedEnsembleQcState;
}>;

export const REALIZATION_FILTER_SET_STATE_SCHEMA: JTDSchemaType<SerializedRealizationFilterSetState> = {
    elements: {
        properties: {
            ensembleIdentString: { type: "string" },
            realizationFilter: REALIZATION_FILTER_STATE_SCHEMA,
        },
    },
} as const;

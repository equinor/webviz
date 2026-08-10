import type { JTDSchemaType } from "ajv/dist/jtd";

import { ENSEMBLE_QC_STATE_SCHEMA, type SerializedEnsembleQcState } from "./EnsembleQc.schema";

export type SerializedEnsembleQcSetState = Array<{
    ensembleIdentString: string;
    ensembleQc: SerializedEnsembleQcState;
}>;

export const ENSEMBLE_QC_SET_STATE_SCHEMA: JTDSchemaType<SerializedEnsembleQcSetState> = {
    elements: {
        properties: {
            ensembleIdentString: { type: "string" },
            ensembleQc: ENSEMBLE_QC_STATE_SCHEMA,
        },
    },
} as const;

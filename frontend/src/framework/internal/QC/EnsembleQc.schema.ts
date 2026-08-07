import { JTDSchemaType } from "ajv/dist/core";

export type SerializedEnsembleQcState = {
    ensembleIdentString: string;
};

export const ENSEMBLE_QC_STATE_SCHEMA: JTDSchemaType<SerializedEnsembleQcState> = {
    properties: {
        ensembleIdentString: { type: "string" },
    },
} as const;

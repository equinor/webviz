import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export interface VectorSpec {
    ensembleIdent: RegularEnsembleIdent;
    vectorName: string;
    hasHistorical: boolean;
}

export const FrequencyEnumToStringMapping = {
    [Frequency_api.DAILY]: "Daily",
    [Frequency_api.WEEKLY]: "Weekly",
    [Frequency_api.MONTHLY]: "Monthly",
    [Frequency_api.QUARTERLY]: "Quarterly",
    [Frequency_api.YEARLY]: "Yearly",
};

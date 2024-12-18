import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
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

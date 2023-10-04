import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
    hasHistoricalVector: boolean;
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency_api | null;
    showStatistics: boolean;
    showRealizations: boolean;
    showHistorical: boolean;
    realizationsToInclude: number[] | null;
}

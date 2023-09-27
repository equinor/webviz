import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
    hasHistorical: boolean;
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency_api | null;
    selectedSensitivities: string[] | null;
    showStatistics: boolean;
    showRealizations: boolean;
    realizationsToInclude: number[] | null;
    showHistorical: boolean;
}

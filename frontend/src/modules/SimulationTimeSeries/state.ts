import { Frequency } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency | null;
    showStatistics: boolean;
    realizationsToInclude: number[] | null;
}

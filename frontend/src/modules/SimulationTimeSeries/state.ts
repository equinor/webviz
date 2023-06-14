import { Frequency_api } from "@api";

export interface VectorSpec {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
    vectorName: string;
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency_api | null;
    showStatistics: boolean;
    realizationsToInclude: number[] | null;
}

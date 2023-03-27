import { Frequency } from "@api";

export interface VectorSpec {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
    vectorName: string;
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency | null;
    showStatistics: boolean;
    realizationsToInclude: number[] | null;
}

import { Frequency } from "@api";

export interface VectorSpec {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
    vectorName: string;
    timeStep: string;
    parameterName: string
}

export interface State {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency | null;
    showStatistics: boolean;
    realizationsToInclude: number[] | null;
    timeStep: string | null;
    parameterName: string | undefined
}

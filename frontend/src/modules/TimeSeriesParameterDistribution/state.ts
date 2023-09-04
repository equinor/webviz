export interface VectorSpec {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
    vectorName: string;
}

export interface State {
    vectorSpec: VectorSpec | null;
    timestampUtcMs: number | null;
    parameterName: string | undefined;
}

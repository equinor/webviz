export enum PlotType {
    FullTriangularMatrix = "fullTriangularMatrix",
    FullMirroredMatrix = "fullMirroredMatrix",
    ParameterResponseMatrix = "parameterResponseMatrix",
}

export type CorrelationSettings = {
    threshold: number | null;
    hideIndividualCells: boolean;
    filterColumns: boolean;
    filterRows: boolean;
};

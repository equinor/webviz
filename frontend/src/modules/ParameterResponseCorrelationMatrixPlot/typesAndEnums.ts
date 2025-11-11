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
export const MAX_NUMBER_OF_PARAMETERS_IN_MATRIX = 500; // To avoid performance issues

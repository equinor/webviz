export enum PlotType {
    FullMatrix = "fullMatrix",
    ParameterResponseMatrix = "parameterResponseMatrix",
}

export type CorrelationSettings = {
    threshold: number | null;
    hideIndividualCells: boolean;
    filterColumns: boolean;
    filterRows: boolean;
};

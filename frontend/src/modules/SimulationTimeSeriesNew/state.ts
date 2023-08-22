import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
}

export enum GroupBy {
    Ensemble = "ensemble",
    TimeSeries = "timeSeries",
    None = "None",
}

export const GroupByString = {
    [GroupBy.Ensemble]: "Ensemble",
    [GroupBy.TimeSeries]: "Time Series",
    [GroupBy.None]: "None",
};

export interface State {
    groupBy: GroupBy;
    vectorSpecifications: VectorSpec[] | null;
    resamplingFrequency: Frequency_api | null;
    showStatistics: boolean;
    statisticsToInclude: StatisticFunction_api[] | null;
    realizationsToInclude: number[] | null;
}

export enum DataLoadingStatus {
    IDLE = "idle",
    LOADING = "loading",
    ERROR = "error",
}

export enum RealizationMode {
    AGGREGATED = "aggregated",
    SINGLE = "single",
}

export const RealizationModeEnumToStringMapping = {
    [RealizationMode.AGGREGATED]: "Aggregated",
    [RealizationMode.SINGLE]: "Single",
};

export enum TimeAggregationFunction {
    MAX = "max",
    AVERAGE = "average",
}

export const TimeAggregationFunctionEnumToStringMapping = {
    [TimeAggregationFunction.MAX]: "Max",
    [TimeAggregationFunction.AVERAGE]: "Average",
};

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

export enum TimeAggregationMode {
    NONE = "none",
    MAX = "max",
    AVERAGE = "average",
}

export const TimeAggregationModeEnumToStringMapping = {
    [TimeAggregationMode.NONE]: "None",
    [TimeAggregationMode.MAX]: "Max",
    [TimeAggregationMode.AVERAGE]: "Average",
};

export interface CompletionDateSelections {
    completionDateIndexSelection: number | [number, number]; // Note: Not possible with null
    timeAggregationMode: TimeAggregationMode;
}

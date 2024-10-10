export enum DataLoadingStatus {
    IDLE = "idle",
    LOADING = "loading",
    ERROR = "error",
}

export enum RealizationSelection {
    AGGREGATED = "aggregated",
    SINGLE = "single",
}

export const RealizationSelectionEnumToStringMapping = {
    [RealizationSelection.AGGREGATED]: "Aggregated",
    [RealizationSelection.SINGLE]: "Single",
};

export enum TimeAggregationSelection {
    NONE = "none",
    MAX = "max",
    AVERAGE = "average",
}

export const TimeAggregationSelectionEnumToStringMapping = {
    [TimeAggregationSelection.NONE]: "None",
    [TimeAggregationSelection.MAX]: "Max",
    [TimeAggregationSelection.AVERAGE]: "Average",
};

export interface CompletionDateSelections {
    completionDateIndexSelection: number | [number, number]; // Note: Not possible with null
    timeAggregationSelection: TimeAggregationSelection;
}

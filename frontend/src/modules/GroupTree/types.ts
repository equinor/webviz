import { Frequency_api, StatOption_api } from "@api";

export const FrequencyEnumToStringMapping = {
    [Frequency_api.YEARLY]: "Yearly",
    [Frequency_api.QUARTERLY]: "Quarterly",
    [Frequency_api.MONTHLY]: "Monthly",
    [Frequency_api.DAILY]: "Daily",
    [Frequency_api.WEEKLY]: "Weekly",
};

export const StatOptionEnumToStringMapping = {
    [StatOption_api.MEAN]: "Mean",
    [StatOption_api.MIN]: "Min",
    [StatOption_api.MAX]: "Max",
    [StatOption_api.P10]: "P10",
    [StatOption_api.P90]: "P90",
    [StatOption_api.P50]: "P50",
};

export enum GroupTreeDataTypeOption {
    STATISTICS = "statistics",
    INDIVIDUAL_REALIZATION = "Individual_realization",
}

export const GroupTreeDataTypeOptionEnumToStringMapping = {
    [GroupTreeDataTypeOption.STATISTICS]: "Statistics",
    [GroupTreeDataTypeOption.INDIVIDUAL_REALIZATION]: "Individual Realization",
};

export enum QueryStatus {
    Loading = "Loading",
    Error = "Error",
    Idle = "Idle",
}

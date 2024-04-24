import { Frequency_api } from "@api";

export const FrequencyEnumToStringMapping = {
    [Frequency_api.YEARLY]: "Yearly",
    [Frequency_api.QUARTERLY]: "Quarterly",
    [Frequency_api.MONTHLY]: "Monthly",
    [Frequency_api.DAILY]: "Daily",
    [Frequency_api.WEEKLY]: "Weekly",
};

export enum GroupTreeDataTypeOption {
    STATISTICS = "statistics",
    REALIZATION = "realization",
}

export enum QueryStatus {
    Loading = "Loading",
    Error = "Error",
    Idle = "Idle",
}

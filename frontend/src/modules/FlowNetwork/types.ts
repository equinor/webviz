import { Frequency_api, NodeType_api } from "@api";

export const FrequencyEnumToStringMapping = {
    [Frequency_api.YEARLY]: "Yearly",
    [Frequency_api.QUARTERLY]: "Quarterly",
    [Frequency_api.MONTHLY]: "Monthly",
    [Frequency_api.DAILY]: "Daily",
    [Frequency_api.WEEKLY]: "Weekly",
};

export const NodeTypeEnumToStringMapping = {
    [NodeType_api.INJ]: "Injector",
    [NodeType_api.PROD]: "Producer",
    [NodeType_api.OTHER]: "Other",
};

export enum FlowNetworkDataTypeOption {
    STATISTICS = "statistics",
    INDIVIDUAL_REALIZATION = "Individual_realization",
}

export const FLowNetworkDataTypeOptionEnumToStringMapping = {
    [FlowNetworkDataTypeOption.STATISTICS]: "Statistics",
    [FlowNetworkDataTypeOption.INDIVIDUAL_REALIZATION]: "Individual Realization",
};

export enum QueryStatus {
    Loading = "Loading",
    Error = "Error",
    Idle = "Idle",
}

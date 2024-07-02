export enum InplaceVolumetricsTableType {
    MEAN_AGGREGATION = "mean_aggregation",
    STATISTICS_AGGREGATION = "statistics_aggregation",
}

export const InplaceVolumetricsTableTypeToStringMapping = {
    [InplaceVolumetricsTableType.MEAN_AGGREGATION]: "Mean Aggregation",
    [InplaceVolumetricsTableType.STATISTICS_AGGREGATION]: "Statistics Aggregation",
};

export enum AggregateByOption {
    FLUID_ZONE = "fluid_zone", // TODO: Ensure if fluid_zone is an aggregate on -> (aggregate across oil/gas zones)
    FACIES = "facies",
    REGION = "region",
    ZONE = "zone",
    REALIZATION = "realization",
}

export const AggregateByOptionToStringMapping = {
    [AggregateByOption.FLUID_ZONE]: "Fluid Zone",
    [AggregateByOption.FACIES]: "Facies",
    [AggregateByOption.REGION]: "Region",
    [AggregateByOption.ZONE]: "Zone",
    [AggregateByOption.REALIZATION]: "Realization",
};

export enum QueriesStatus {
    Loading = "loading",
    SomeFailed = "some_failed",
    AllFailed = "all_failed",
    Success = "success",
}

export type AvailableInplaceVolumetricsIndices = {
    zones: string[];
    regions: string[];
    facies: string[];
};

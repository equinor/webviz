export enum ParameterDistributionPlotType {
    HISTOGRAM = "histogram",
    DISTRIBUTION_PLOT = "distribution",
    BOX_PLOT = "box",
}

export const ParameterDistributionPlotTypeEnumToStringMapping = {
    [ParameterDistributionPlotType.HISTOGRAM]: "Histogram",
    [ParameterDistributionPlotType.DISTRIBUTION_PLOT]: "Distribution Plot",
    [ParameterDistributionPlotType.BOX_PLOT]: "Box Plot",
};

export enum EnsembleMode {
    INDEPENDENT = "independent",
    PRIOR_POSTERIOR = "prior-posterior",
}
export enum ParameterDistributionSortingMethod {
    ALPHABETICAL = "alphabetical",
    VARIANCE = "variance",
    NONE = "none",
}
export const ParameterDistributionSortingMethodEnumToStringMapping = {
    [ParameterDistributionSortingMethod.ALPHABETICAL]: "Alphabetical",
    [ParameterDistributionSortingMethod.VARIANCE]: "Prior-Posterior Variance",
    [ParameterDistributionSortingMethod.NONE]: "No sorting",
};
export const EnsembleModeEnumToStringMapping = {
    [EnsembleMode.INDEPENDENT]: "Independent",
    [EnsembleMode.PRIOR_POSTERIOR]: "Prior-Posterior",
};

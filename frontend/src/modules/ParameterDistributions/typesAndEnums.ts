import { ParameterSortMethod } from "./view/utils/parameterSorting";

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

export const ParameterDistributionSortingMethodEnumToStringMapping = {
    [ParameterSortMethod.ALPHABETICAL]: "Alphabetical",
    [ParameterSortMethod.ENTROPY]: "Prior-Posterior Entropy Reduction",
    [ParameterSortMethod.KL_DIVERGENCE]: "Prior-Posterior KL Divergence",
};
export const EnsembleModeEnumToStringMapping = {
    [EnsembleMode.INDEPENDENT]: "Independent",
    [EnsembleMode.PRIOR_POSTERIOR]: "Prior-Posterior",
};

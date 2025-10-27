import type { NumberOrRange, NumberRange } from "@framework/utils/numberUtils";

export enum RealizationFilterType {
    BY_REALIZATION_NUMBER = "byRealizationNumber",
    BY_PARAMETER_VALUES = "byParameterValues",
}
export const RealizationFilterTypeStringMapping = {
    [RealizationFilterType.BY_REALIZATION_NUMBER]: "By Realizations",
    [RealizationFilterType.BY_PARAMETER_VALUES]: "By Parameters",
};

export enum IncludeExcludeFilter {
    INCLUDE_FILTER = "includeFilter",
    EXCLUDE_FILTER = "excludeFilter",
}
export const IncludeExcludeFilterEnumToStringMapping = {
    [IncludeExcludeFilter.INCLUDE_FILTER]: "Include Filter",
    [IncludeExcludeFilter.EXCLUDE_FILTER]: "Exclude Filter",
};

export type RealizationNumberSelection = NumberOrRange;

export type ContinuousParameterValueSelection = Readonly<NumberRange>;
export type DiscreteParameterValueSelection = readonly string[] | readonly number[];
export type ParameterValueSelection = ContinuousParameterValueSelection | DiscreteParameterValueSelection;

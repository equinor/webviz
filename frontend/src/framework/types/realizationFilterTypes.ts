export enum RealizationFilterType {
    BY_REALIZATION_NUMBER = "byRealizationNumber",
    BY_PARAMETER_VALUES = "byParameterValues",
}
export const RealizationFilterTypeStringMapping = {
    [RealizationFilterType.BY_REALIZATION_NUMBER]: "By realization number",
    [RealizationFilterType.BY_PARAMETER_VALUES]: "By parameter values",
};

export enum IncludeExcludeFilter {
    INCLUDE_FILTER = "includeFilter",
    EXCLUDE_FILTER = "excludeFilter",
}
export const IncludeExcludeFilterEnumToStringMapping = {
    [IncludeExcludeFilter.INCLUDE_FILTER]: "Include Filter",
    [IncludeExcludeFilter.EXCLUDE_FILTER]: "Exclude Filter",
};

export type NumberRange = { start: number; end: number };
export type RealizationNumberSelection = NumberRange | number;

export type ContinuousParameterValueSelection = Readonly<NumberRange>;
export type DiscreteParameterValueSelection = Readonly<string[] | number[]>;
export type ParameterValueSelection = ContinuousParameterValueSelection | DiscreteParameterValueSelection;

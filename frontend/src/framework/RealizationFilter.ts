import { isEqual } from "lodash";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { ContinuousParameter } from "./EnsembleParameters";

export enum RealizationFilterType {
    REALIZATION_INDEX = "realizationIndex",
    PARAMETER_VALUES = "parameterValues",
}
export const RealizationFilterTypeStringMapping = {
    [RealizationFilterType.REALIZATION_INDEX]: "Realization index",
    [RealizationFilterType.PARAMETER_VALUES]: "Parameter values",
};

export enum RealizationFilteringOption {
    INCLUDE = "include",
    EXCLUDE = "exclude",
}
export const RealizationFilteringOptionStringMapping = {
    [RealizationFilteringOption.INCLUDE]: "Include",
    [RealizationFilteringOption.EXCLUDE]: "Exclude",
};

export class RealizationContinuousParameterValueFilter {
    private _parameter: ContinuousParameter;
    private _minMax: [number, number];

    constructor(parameter: ContinuousParameter) {
        this._parameter = parameter;
        this._minMax = [Math.min(...parameter.values), Math.max(...parameter.values)];
    }

    getRealizationsWithinMinMax(): readonly number[] {
        const realizationIndicesWithinMinMax: number[] = [];
        this._parameter.values.forEach((value, index) => {
            if (value >= this._minMax[0] && value <= this._minMax[1]) {
                realizationIndicesWithinMinMax.push(this._parameter.realizations[index]);
            }
        });

        return realizationIndicesWithinMinMax;
    }

    setParameterRange(min: number, max: number): void {
        this._minMax = [min, max];
    }
}

export type IndexRangeType = { start: number; end: number };
export type RealizationIndexSelectionType = IndexRangeType | number;

export class RealizationFilter {
    private _parentEnsemble: Ensemble;
    private _filteringOption: RealizationFilteringOption;
    private _filterType: RealizationFilterType;

    private _realizationIndexSelections: readonly RealizationIndexSelectionType[] | null;
    private _parameterValueFilters: RealizationContinuousParameterValueFilter[];

    // Internal array for ref stability
    private _filteredRealizations: readonly number[];

    constructor(
        parentEnsemble: Ensemble,
        initialFilteringOption = RealizationFilteringOption.INCLUDE,
        initialFilterType = RealizationFilterType.REALIZATION_INDEX
    ) {
        this._parentEnsemble = parentEnsemble;
        this._filteringOption = initialFilteringOption;
        this._filterType = initialFilterType;
        this._filteredRealizations = parentEnsemble.getRealizations();

        this._realizationIndexSelections = null;
        this._parameterValueFilters = [];
    }

    getParentEnsembleIdent(): EnsembleIdent {
        return this._parentEnsemble.getIdent();
    }

    setRealizationIndexSelections(selections: readonly RealizationIndexSelectionType[] | null): void {
        this._realizationIndexSelections = selections;

        // Update internal array if resulting realizations has changed
        if (this._filterType === RealizationFilterType.REALIZATION_INDEX) {
            this.runSelectedRealizationIndexFiltering();
        }
    }

    getRealizationIndexSelections(): readonly RealizationIndexSelectionType[] | null {
        return this._realizationIndexSelections;
    }

    setParameterValueFilters(parameterValueFilters: RealizationContinuousParameterValueFilter[]): void {
        this._parameterValueFilters = parameterValueFilters;

        if (this._filterType === RealizationFilterType.PARAMETER_VALUES) {
            this.runParameterValueFiltering();
        }
    }

    updateParameterValueFiltering(): void {
        if (this._filterType !== RealizationFilterType.PARAMETER_VALUES) return;

        this.runParameterValueFiltering();
    }

    // Get reference and modify it directly, thereafter call updateParameterValueFiltering?
    getParameterValueFilters(): RealizationContinuousParameterValueFilter[] {
        return this._parameterValueFilters;
    }

    setFilterType(filterType: RealizationFilterType): void {
        if (filterType === this._filterType) return;

        this._filterType = filterType;
        this.runFiltering();
    }

    getFilterType(): RealizationFilterType {
        return this._filterType;
    }

    setFilteringOption(filteringOption: RealizationFilteringOption): void {
        this._filteringOption = filteringOption;
        this.runFiltering();
    }

    getFilteringOption(): RealizationFilteringOption {
        return this._filteringOption;
    }

    getFilteredRealizations(): readonly number[] {
        return this._filteredRealizations;
    }

    private runFiltering(): void {
        if (this._filterType === RealizationFilterType.REALIZATION_INDEX) {
            this.runSelectedRealizationIndexFiltering();
        } else if (this._filterType === RealizationFilterType.PARAMETER_VALUES) {
            this.runParameterValueFiltering();
        }
    }

    private runSelectedRealizationIndexFiltering(): void {
        let newFilteredRealizations = this._parentEnsemble.getRealizations();

        // If realization index selection is provided, filter the realizations
        if (this._realizationIndexSelections !== null) {
            // Create index array from realization index selection
            const realizationIndexArray: number[] = [];
            this._realizationIndexSelections.forEach((elm) => {
                if (typeof elm === "number") {
                    realizationIndexArray.push(elm);
                } else {
                    realizationIndexArray.push(
                        ...Array.from({ length: elm.end - elm.start + 1 }, (_, i) => elm.start + i)
                    );
                }
            });

            newFilteredRealizations = this.createIncludeOrExcludeFilteredRealizationsArray(realizationIndexArray);
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    private runParameterValueFiltering(): void {
        let newFilteredRealizations = this._parentEnsemble.getRealizations();

        // Parameter filtering - intersection of realization indices across all parameter filters
        if (this._parameterValueFilters.length > 0) {
            const realizationIndicesWithinMinMax = [...this._parameterValueFilters[0].getRealizationsWithinMinMax()];
            for (let i = 1; i < this._parameterValueFilters.length; i++) {
                realizationIndicesWithinMinMax.filter((realization) => {
                    return this._parameterValueFilters[i].getRealizationsWithinMinMax().includes(realization);
                });
            }

            newFilteredRealizations =
                this.createIncludeOrExcludeFilteredRealizationsArray(realizationIndicesWithinMinMax);
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    private createIncludeOrExcludeFilteredRealizationsArray(sourceRealizations: readonly number[]): readonly number[] {
        const validRealizations = this._parentEnsemble.getRealizations();

        if (this._filteringOption === RealizationFilteringOption.INCLUDE) {
            return sourceRealizations.filter((elm) => validRealizations.includes(elm));
        }

        return validRealizations.filter((elm) => !sourceRealizations.includes(elm));
    }
}

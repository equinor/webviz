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

type RealizationIndexSelection = {
    realizations: readonly number[];
    rangeTags: readonly string[]; // TODO: Have rangeTags outside of RealizationFilter class? How to distinguish between empty realizationPicker and input resulting in no realizations?
};

export class RealizationFilter {
    private _filterType: RealizationFilterType;
    private _parentEnsemble: Ensemble;

    private _realizationIndexSelection: RealizationIndexSelection;
    private _parameterValueFilters: RealizationContinuousParameterValueFilter[];

    // Internal array for ref stability
    private _filteredRealizations: readonly number[];

    constructor(parentEnsemble: Ensemble, initialFilterType = RealizationFilterType.REALIZATION_INDEX) {
        this._filterType = initialFilterType;
        this._parentEnsemble = parentEnsemble;
        this._filteredRealizations = parentEnsemble.getRealizations();

        this._realizationIndexSelection = { realizations: [], rangeTags: [] };
        this._parameterValueFilters = [];
    }

    getParentEnsembleIdent(): EnsembleIdent {
        return this._parentEnsemble.getIdent();
    }

    setSelectedRealizationsAndRangeTags(selection: RealizationIndexSelection): void {
        this._realizationIndexSelection = selection;

        // Update internal array if resulting realizations has changed
        if (this._filterType === RealizationFilterType.REALIZATION_INDEX) {
            this.runSelectedRealizationIndexFiltering();
        }
    }

    getSelectedRealizations(): readonly number[] {
        return this._realizationIndexSelection.realizations;
    }

    getSelectedRangeTags(): readonly string[] {
        return this._realizationIndexSelection.rangeTags;
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
        if (filterType === RealizationFilterType.REALIZATION_INDEX) {
            this.runSelectedRealizationIndexFiltering();
        } else if (filterType === RealizationFilterType.PARAMETER_VALUES) {
            this.runParameterValueFiltering();
        }
    }

    getFilterType(): RealizationFilterType {
        return this._filterType;
    }

    getFilteredRealizations(): readonly number[] {
        return this._filteredRealizations;
    }

    private runSelectedRealizationIndexFiltering(): void {
        let newFilteredRealizations = this._parentEnsemble.getRealizations();

        // If there are any range tags, filter the realizations
        if (this._realizationIndexSelection.rangeTags.length > 0) {
            newFilteredRealizations = this._realizationIndexSelection.realizations.filter((elm) =>
                this._parentEnsemble.getRealizations().includes(elm)
            );
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    private runParameterValueFiltering(): void {
        let newFilteredRealizations = this._parentEnsemble.getRealizations();

        // Parameter filtering - intersection of realization indices across all parameter filters
        if (this._parameterValueFilters.length > 0) {
            const validRealizations = this._parentEnsemble.getRealizations();
            const realizationIndicesWithinMinMax = [...this._parameterValueFilters[0].getRealizationsWithinMinMax()];
            for (let i = 1; i < this._parameterValueFilters.length; i++) {
                realizationIndicesWithinMinMax.filter((realization) => {
                    return this._parameterValueFilters[i].getRealizationsWithinMinMax().includes(realization);
                });
            }
            newFilteredRealizations = realizationIndicesWithinMinMax.filter((elm) => validRealizations.includes(elm));
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }
}

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
    rangeTags: readonly string[];
};

export class RealizationFilter {
    private _filterType: RealizationFilterType;
    private _parentEnsemble: Ensemble;

    private _selectedRealizationIndexSelection: RealizationIndexSelection;
    private _parameterValueFilters: RealizationContinuousParameterValueFilter[];

    constructor(parentEnsemble: Ensemble, initialFilterType = RealizationFilterType.REALIZATION_INDEX) {
        this._filterType = initialFilterType;
        this._parentEnsemble = parentEnsemble;

        this._selectedRealizationIndexSelection = { realizations: [], rangeTags: [] };

        this._parameterValueFilters = [];
    }

    getParentEnsembleIdent(): EnsembleIdent {
        return this._parentEnsemble.getIdent();
    }

    setSelectedRealizationsAndRangeTags(selection: RealizationIndexSelection): void {
        this._selectedRealizationIndexSelection = selection;
    }

    getSelectedRealizations(): readonly number[] {
        return this._selectedRealizationIndexSelection.realizations;
    }

    getSelectedRangeTags(): readonly string[] {
        return this._selectedRealizationIndexSelection.rangeTags;
    }

    addParameterValueFilter(parameterValueFilter: RealizationContinuousParameterValueFilter): void {
        this._parameterValueFilters.push(parameterValueFilter);
    }

    getParameterValueFilters(): RealizationContinuousParameterValueFilter[] {
        return this._parameterValueFilters;
    }

    getFilterType(): RealizationFilterType {
        return this._filterType;
    }

    setFilterType(filterType: RealizationFilterType): void {
        this._filterType = filterType;
    }

    getFilteredRealizations(): number[] {
        const validRealizations = this._parentEnsemble.getRealizations();

        if (validRealizations.length === 0) {
            return [];
        }

        // Realization index filter
        if (this._filterType === RealizationFilterType.REALIZATION_INDEX) {
            return this._selectedRealizationIndexSelection.realizations.filter((elm) =>
                validRealizations.includes(elm)
            );
        }

        // Parameter filtering - intersection of realization indices across all parameter filters
        if (this._parameterValueFilters.length > 0) {
            const realizationIndicesWithinMinMax = [...this._parameterValueFilters[0].getRealizationsWithinMinMax()];
            for (let i = 1; i < this._parameterValueFilters.length; i++) {
                realizationIndicesWithinMinMax.filter((realization) => {
                    return this._parameterValueFilters[i].getRealizationsWithinMinMax().includes(realization);
                });
            }
            return realizationIndicesWithinMinMax.filter((elm) => validRealizations.includes(elm));
        }

        // No filtering active
        return [...validRealizations];
    }
}

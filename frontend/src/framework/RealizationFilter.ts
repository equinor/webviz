import { isEqual } from "lodash";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "./EnsembleParameters";

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

/**
 * Class for filtering realizations based on realization number or parameter values.
 *
 * The class is designed to be used in conjunction with the Ensemble class.
 *
 * The class is designed to keep track of the filtering state and provide the filtered realizations
 * for an ensemble.
 *
 * Should not provide interface to get the Ensemble object itself, but can provide access to information about the ensemble,
 * such as the ensemble ident and realization numbers.
 */
export class RealizationFilter {
    private _assignedEnsemble: Ensemble;
    private _includeExcludeFilter: IncludeExcludeFilter;
    private _filterType: RealizationFilterType;

    private _realizationNumberSelections: readonly RealizationNumberSelection[] | null;

    // Map of parameterIdent string to selected NumberRange
    // NOTE:
    // - Map key string vs ParameterIdent object? How to compare/get from map with ParameterIdent object? (Reference equality)
    // - Consider array of pairs: [ParameterIdent, NumberRange] where ParameterIdents must be unique
    private _continuousParameterIdentStringRangeMap: Map<string, NumberRange> | null;

    // Internal array for ref stability
    private _filteredRealizations: readonly number[];

    constructor(
        assignedEnsemble: Ensemble,
        initialIncludeExcludeFilter = IncludeExcludeFilter.INCLUDE_FILTER,
        initialFilterType = RealizationFilterType.BY_REALIZATION_NUMBER
    ) {
        this._assignedEnsemble = assignedEnsemble;
        this._includeExcludeFilter = initialIncludeExcludeFilter;
        this._filterType = initialFilterType;
        this._filteredRealizations = assignedEnsemble.getRealizations();

        this._realizationNumberSelections = null;
        this._continuousParameterIdentStringRangeMap = null;
    }

    getAvailableEnsembleRealizations(): readonly number[] {
        return this._assignedEnsemble.getRealizations();
    }

    getAvailableEnsembleParameterArray(): readonly Parameter[] {
        return this._assignedEnsemble.getParameters().getParameterArr();
    }

    getAssignedEnsembleIdent(): EnsembleIdent {
        return this._assignedEnsemble.getIdent();
    }

    setRealizationNumberSelections(selections: readonly RealizationNumberSelection[] | null): void {
        this._realizationNumberSelections = selections;

        // Update internal array if resulting realizations has changed
        if (this._filterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            this.runRealizationNumberSelectionFiltering();
        }
    }

    setContinuousParameterIdentStringRangeMap(map: Map<string, NumberRange> | null): void {
        this._continuousParameterIdentStringRangeMap = map;

        // Validate parameterIdent strings
        if (map !== null) {
            for (const key of map.keys()) {
                const parameterIdent = ParameterIdent.fromString(key);
                const parameter = this._assignedEnsemble.getParameters().findParameter(parameterIdent);
                if (!parameter) {
                    throw new Error(
                        `Invalid parameterIdent string "${key}" for ensemble ${this._assignedEnsemble.getIdent()}`
                    );
                }
                if (parameter.type !== ParameterType.CONTINUOUS) {
                    throw new Error(`Parameter ${key} is not a continuous parameter`);
                }
            }
        }

        // Update internal array if resulting realizations has changed
        if (this._filterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            this.runContinuousParameterRangeSelectionsFiltering();
        }
    }

    getRealizationNumberSelections(): readonly RealizationNumberSelection[] | null {
        return this._realizationNumberSelections;
    }

    getContinuousParameterIdentRangeReadonlyMap(): ReadonlyMap<string, NumberRange> | null {
        // Read only to prevent external modification
        if (this._continuousParameterIdentStringRangeMap === null) {
            return null;
        }

        const readonlyMap: ReadonlyMap<string, NumberRange> = this._continuousParameterIdentStringRangeMap;
        return readonlyMap;
    }

    setFilterType(filterType: RealizationFilterType): void {
        if (filterType === this._filterType) return;

        this._filterType = filterType;
        this.runFiltering();
    }

    getFilterType(): RealizationFilterType {
        return this._filterType;
    }

    setIncludeOrExcludeFilter(value: IncludeExcludeFilter): void {
        this._includeExcludeFilter = value;
        this.runFiltering();
    }

    getIncludeOrExcludeFilter(): IncludeExcludeFilter {
        return this._includeExcludeFilter;
    }

    getFilteredRealizations(): readonly number[] {
        return this._filteredRealizations;
    }

    private runFiltering(): void {
        if (this._filterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            this.runRealizationNumberSelectionFiltering();
        } else if (this._filterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            this.runContinuousParameterRangeSelectionsFiltering();
        }
    }

    private runRealizationNumberSelectionFiltering(): void {
        let newFilteredRealizations = this._assignedEnsemble.getRealizations();

        // If realization number selection is provided, filter the realizations
        if (this._realizationNumberSelections !== null) {
            // Create array from realization number selection
            const realizationNumberArray: number[] = [];
            this._realizationNumberSelections.forEach((elm) => {
                if (typeof elm === "number") {
                    realizationNumberArray.push(elm);
                } else {
                    realizationNumberArray.push(
                        ...Array.from({ length: elm.end - elm.start + 1 }, (_, i) => elm.start + i)
                    );
                }
            });

            newFilteredRealizations = this.createIncludeOrExcludeFilteredRealizationsArray(realizationNumberArray);
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    private runContinuousParameterRangeSelectionsFiltering(): void {
        let newFilteredRealizations = this._assignedEnsemble.getRealizations();

        // If parameter range selections are provided, filter the realizations
        // Note: Parameter range filtering does not support exclude filtering, it only includes realizations
        // that have values within the specified range
        if (this._continuousParameterIdentStringRangeMap !== null) {
            const parameters = this._assignedEnsemble.getParameters();

            // Apply value range filter per continuous parameter with AND logic
            for (const [parameterIdentString, range] of this._continuousParameterIdentStringRangeMap) {
                const parameterIdent = ParameterIdent.fromString(parameterIdentString);
                const parameter = parameters.findParameter(parameterIdent);
                if (!parameter || parameter.type !== ParameterType.CONTINUOUS) {
                    continue;
                }

                // Get indices of values within range
                const valueIndicesWithinRange: number[] = [];
                for (const [index, value] of parameter.values.entries()) {
                    if (value >= range.start || value <= range.end) {
                        valueIndicesWithinRange.push(index);
                    }
                }

                // Find the realization numbers at indices
                // - Assuming realizations and values to be same length
                const realizationsWithinRange = valueIndicesWithinRange.map((index) => parameter.realizations[index]);

                // Intersect with new filtered realization array
                newFilteredRealizations = newFilteredRealizations.filter((elm) =>
                    realizationsWithinRange.includes(elm)
                );
            }
        }

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    private createIncludeOrExcludeFilteredRealizationsArray(sourceRealizations: readonly number[]): readonly number[] {
        const validRealizations = this._assignedEnsemble.getRealizations();

        if (this._includeExcludeFilter === IncludeExcludeFilter.INCLUDE_FILTER) {
            return sourceRealizations.filter((elm) => validRealizations.includes(elm));
        }

        return validRealizations.filter((elm) => !sourceRealizations.includes(elm));
    }
}

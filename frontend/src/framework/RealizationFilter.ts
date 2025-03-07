import { isEqual } from "lodash";

import type { DeltaEnsemble } from "./DeltaEnsemble";
import type { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import type { ContinuousParameter, DiscreteParameter, EnsembleParameters, Parameter } from "./EnsembleParameters";
import { ParameterIdent, ParameterType } from "./EnsembleParameters";
import type { RegularEnsemble } from "./RegularEnsemble";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type {
    DiscreteParameterValueSelection,
    NumberRange,
    ParameterValueSelection,
    RealizationNumberSelection,
} from "./types/realizationFilterTypes";
import { IncludeExcludeFilter, RealizationFilterType } from "./types/realizationFilterTypes";
import { isArrayOfNumbers, isArrayOfStrings } from "./utils/arrayUtils";
import {
    isValueSelectionAnArrayOfNumber,
    isValueSelectionAnArrayOfString,
    makeRealizationNumberArrayFromSelections,
} from "./utils/realizationFilterTypesUtils";

/**
 * Class for filtering realizations based on realization number or parameter values.
 *
 * The class is designed to be used in conjunction with the RegularEnsemble or DeltaEnsemble class.
 *
 * The class is designed to keep track of the filtering state and provide the filtered realizations
 * for an ensemble.
 *
 * Should not provide interface to get the RegularEnsemble/DeltaEnsemble object itself, but can provide
 * access to information about the ensemble - such as the ensemble ident and realization numbers.
 */
export class RealizationFilter {
    private _assignedEnsemble: RegularEnsemble | DeltaEnsemble;
    private _includeExcludeFilter: IncludeExcludeFilter;
    private _filterType: RealizationFilterType;

    private _realizationNumberSelections: readonly RealizationNumberSelection[] | null;

    // Map of parameterIdent string to value selection (Both continuous and discrete parameters)
    // - Map vs object: { [parameterIdentString: string]: ParameterValueSelection } - object?
    // - Consider array of pairs: [ParameterIdent, NumberRange] where ParameterIdents must be unique
    private _parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null;

    // Internal array for ref stability
    private _filteredRealizations: readonly number[];

    constructor(
        assignedEnsemble: RegularEnsemble | DeltaEnsemble,
        initialIncludeExcludeFilter = IncludeExcludeFilter.INCLUDE_FILTER,
        initialFilterType = RealizationFilterType.BY_REALIZATION_NUMBER,
    ) {
        this._assignedEnsemble = assignedEnsemble;
        this._includeExcludeFilter = initialIncludeExcludeFilter;
        this._filterType = initialFilterType;
        this._filteredRealizations = assignedEnsemble.getRealizations();

        this._realizationNumberSelections = null;
        this._parameterIdentStringToValueSelectionMap = null;
    }

    getAssignedEnsembleIdent(): RegularEnsembleIdent | DeltaEnsembleIdent {
        return this._assignedEnsemble.getIdent();
    }

    setRealizationNumberSelections(selections: readonly RealizationNumberSelection[] | null): void {
        this._realizationNumberSelections = selections;
    }

    setParameterIdentStringToValueSelectionReadonlyMap(
        newMap: ReadonlyMap<string, ParameterValueSelection> | null,
    ): void {
        // Validate parameterIdent strings
        if (newMap !== null) {
            for (const [parameterIdentStr, valueSelection] of newMap) {
                const parameterIdent = ParameterIdent.fromString(parameterIdentStr);
                const parameter = this._assignedEnsemble.getParameters().findParameter(parameterIdent);
                if (!parameter) {
                    throw new Error(
                        `Invalid parameterIdent string "${parameterIdentStr}" for ensemble ${this._assignedEnsemble.getIdent()}`,
                    );
                }

                RealizationFilter.validateParameterAndValueSelection(parameter, valueSelection);
            }
        }

        this._parameterIdentStringToValueSelectionMap = newMap;
    }

    getRealizationNumberSelections(): readonly RealizationNumberSelection[] | null {
        return this._realizationNumberSelections;
    }

    getParameterIdentStringToValueSelectionReadonlyMap(): ReadonlyMap<string, ParameterValueSelection> | null {
        if (this._parameterIdentStringToValueSelectionMap === null) {
            return null;
        }

        return this._parameterIdentStringToValueSelectionMap;
    }

    setFilterType(filterType: RealizationFilterType): void {
        if (filterType === this._filterType) return;

        this._filterType = filterType;
    }

    getFilterType(): RealizationFilterType {
        return this._filterType;
    }

    setIncludeOrExcludeFilter(value: IncludeExcludeFilter): void {
        this._includeExcludeFilter = value;
    }

    getIncludeOrExcludeFilter(): IncludeExcludeFilter {
        return this._includeExcludeFilter;
    }

    getFilteredRealizations(): readonly number[] {
        return this._filteredRealizations;
    }

    runFiltering(): void {
        if (
            this._filterType !== RealizationFilterType.BY_REALIZATION_NUMBER &&
            this._filterType !== RealizationFilterType.BY_PARAMETER_VALUES
        ) {
            throw new Error(`Invalid filter type ${this._filterType}`);
        }

        if (this._filterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            this.runRealizationNumberSelectionFiltering();
            return;
        }
        this.runParameterValueSelectionsFiltering();
    }

    static createFilteredRealizationsFromRealizationNumberSelection(
        realizationNumberSelections: readonly RealizationNumberSelection[] | null,
        validRealizations: readonly number[],
        includeOrExclude: IncludeExcludeFilter,
    ): readonly number[] {
        let newFilteredRealizations = validRealizations;

        // If realization number selection is provided, filter the realizations
        if (realizationNumberSelections !== null) {
            // Create array from realization number selection
            const selectedRealizationNumbers: number[] =
                makeRealizationNumberArrayFromSelections(realizationNumberSelections);

            newFilteredRealizations = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
                includeOrExclude,
                selectedRealizationNumbers,
                validRealizations,
            );
        }
        return newFilteredRealizations;
    }

    static createIncludeOrExcludeFilteredRealizationsArray(
        includeOrExclude: IncludeExcludeFilter,
        selectedRealizations: readonly number[],
        validRealizations: readonly number[],
    ): readonly number[] {
        if (includeOrExclude === IncludeExcludeFilter.INCLUDE_FILTER) {
            return selectedRealizations.filter((elm) => validRealizations.includes(elm));
        }

        // Corrected to exclude values existing in sourceRealizations
        return validRealizations.filter((elm) => !selectedRealizations.includes(elm));
    }

    private runRealizationNumberSelectionFiltering(): void {
        const newFilteredRealizations = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            this._realizationNumberSelections,
            this._assignedEnsemble.getRealizations(),
            this._includeExcludeFilter,
        );

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    static createFilteredRealizationsFromParameterValueSelections(
        parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null,
        validParameters: EnsembleParameters,
        validRealizations: readonly number[],
    ): readonly number[] {
        let newFilteredRealizations = validRealizations;

        if (parameterIdentStringToValueSelectionMap !== null) {
            const parameters = validParameters;

            // Apply value selection filter per parameter with AND logic
            for (const [parameterIdentString, valueSelection] of parameterIdentStringToValueSelectionMap) {
                const parameterIdent = ParameterIdent.fromString(parameterIdentString);
                const parameter = parameters.findParameter(parameterIdent);
                if (!parameter) {
                    continue;
                }

                // Validation of parameters and value selections are performed in setter,
                // thus invalid selections are ignored
                const isValueSelectionArray =
                    isValueSelectionAnArrayOfString(valueSelection) || isValueSelectionAnArrayOfNumber(valueSelection);
                let realizationsFromValueSelection: number[] | null = null;
                if (parameter.type === ParameterType.DISCRETE && isValueSelectionArray) {
                    // Run discrete parameter filtering
                    realizationsFromValueSelection = this.getRealizationNumbersFromParameterValueArray(
                        parameter,
                        valueSelection,
                    );
                } else if (parameter.type === ParameterType.CONTINUOUS && !isValueSelectionArray) {
                    // Run continuous parameter filtering
                    realizationsFromValueSelection = this.getRealizationNumbersFromParameterValueRange(
                        parameter,
                        valueSelection,
                    );
                }

                if (realizationsFromValueSelection === null) {
                    continue;
                }

                // Intersect with new filtered realization array
                newFilteredRealizations = newFilteredRealizations.filter((elm) => {
                    if (realizationsFromValueSelection === null) {
                        throw new Error(`realizationsFromValueSelection is null`);
                    }
                    return realizationsFromValueSelection.includes(elm);
                });
            }
        }

        return newFilteredRealizations;
    }

    private runParameterValueSelectionsFiltering(): void {
        const newFilteredRealizations = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            this._parameterIdentStringToValueSelectionMap,
            this._assignedEnsemble.getParameters(),
            this._assignedEnsemble.getRealizations(),
        );

        if (!isEqual(newFilteredRealizations, this._filteredRealizations)) {
            this._filteredRealizations = newFilteredRealizations;
        }
    }

    static getRealizationNumbersFromParameterValueRange(
        parameter: ContinuousParameter,
        valueRange: Readonly<NumberRange>,
    ): number[] {
        // Get indices of values within range
        const valueIndicesWithinRange: number[] = [];
        for (const [index, value] of parameter.values.entries()) {
            if (value >= valueRange.start && value <= valueRange.end) {
                valueIndicesWithinRange.push(index);
            }
        }

        // Find the realization numbers at indices
        // - Assuming realizations and values to be same length
        return valueIndicesWithinRange.map((index) => parameter.realizations[index]);
    }

    static getRealizationNumbersFromParameterValueArray(
        parameter: DiscreteParameter,
        selectedValueArray: DiscreteParameterValueSelection,
    ): number[] {
        if (selectedValueArray.length === 0 || parameter.values.length === 0) {
            return [];
        }

        const isStringValueSelection = isArrayOfStrings(selectedValueArray);
        const isNumberValues = isArrayOfNumbers(parameter.values);
        if (isStringValueSelection && isNumberValues) {
            throw new Error(
                `Parameter ${parameter.name} is discrete with number values, but value selection is string`,
            );
        }

        const isNumberValueSelection = isArrayOfNumbers(selectedValueArray);
        const isStringValues = isArrayOfStrings(parameter.values);
        if (isNumberValueSelection && isStringValues) {
            throw new Error(
                `Parameter ${parameter.name} is discrete with string values, but value selection is number`,
            );
        }

        const valueIndices: number[] = [];

        // Find indices of string values
        if (isStringValueSelection && isStringValues) {
            for (const [index, value] of parameter.values.entries()) {
                if (selectedValueArray.includes(value)) {
                    valueIndices.push(index);
                }
            }
            return valueIndices.map((index) => parameter.realizations[index]);
        }

        // Find indices of number values
        if (isNumberValueSelection && isNumberValues) {
            for (const [index, value] of parameter.values.entries()) {
                if (selectedValueArray.includes(value)) {
                    valueIndices.push(index);
                }
            }
            return valueIndices.map((index) => parameter.realizations[index]);
        }

        throw new Error(`Parameter ${parameter.name} is discrete with mixed string and number values`);
    }

    static validateParameterAndValueSelection(parameter: Parameter, valueSelection: ParameterValueSelection) {
        if (parameter.type === ParameterType.CONTINUOUS && Array.isArray(valueSelection)) {
            throw new Error(`Parameter ${parameter.name} is continuous, but value selection is not a NumberRange`);
        }
        if (parameter.type === ParameterType.DISCRETE && !Array.isArray(valueSelection)) {
            throw new Error(`Parameter ${parameter.name} is discrete, but value selection is not an array`);
        }

        if (
            parameter.type === ParameterType.DISCRETE &&
            isArrayOfNumbers(parameter.values) &&
            !isValueSelectionAnArrayOfNumber(valueSelection)
        ) {
            // Using !isValueSelectionAnArrayOfNumber, as isValueSelectionAnArrayOfString(valueSelection) is true
            // for empty array
            throw new Error(
                `Parameter ${parameter.name} is discrete with number values, but value selection is strings`,
            );
        }
        if (
            parameter.type === ParameterType.DISCRETE &&
            isArrayOfStrings(parameter.values) &&
            !isValueSelectionAnArrayOfString(valueSelection)
        ) {
            // Using !isValueSelectionAnArrayOfString, as isValueSelectionAnArrayOfNumber(valueSelection) is true
            // for empty array
            throw new Error(
                `Parameter ${parameter.name} is discrete with string values, but value selection is numbers`,
            );
        }
    }
}

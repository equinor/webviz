import { isEqual } from "lodash";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";

export enum RealizationFilterType {
    REALIZATION_INDEX = "realizationIndex",
}
export const RealizationFilterTypeStringMapping = {
    [RealizationFilterType.REALIZATION_INDEX]: "Realization index",
};

export enum RealizationFilteringOption {
    INCLUDE = "include",
    EXCLUDE = "exclude",
}
export const RealizationFilteringOptionStringMapping = {
    [RealizationFilteringOption.INCLUDE]: "Include",
    [RealizationFilteringOption.EXCLUDE]: "Exclude",
};

export type IndexRangeType = { start: number; end: number };
export type RealizationIndexSelectionType = IndexRangeType | number;

export class RealizationFilter {
    private _parentEnsemble: Ensemble;
    private _filteringOption: RealizationFilteringOption;
    private _filterType: RealizationFilterType;

    private _realizationIndexSelections: readonly RealizationIndexSelectionType[] | null;

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
        if (this._filterType !== RealizationFilterType.REALIZATION_INDEX) return;

        this.runSelectedRealizationIndexFiltering();
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

    private createIncludeOrExcludeFilteredRealizationsArray(sourceRealizations: readonly number[]): readonly number[] {
        const validRealizations = this._parentEnsemble.getRealizations();

        if (this._filteringOption === RealizationFilteringOption.INCLUDE) {
            return sourceRealizations.filter((elm) => validRealizations.includes(elm));
        }

        return validRealizations.filter((elm) => !sourceRealizations.includes(elm));
    }
}

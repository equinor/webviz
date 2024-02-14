import { isEqual } from "lodash";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";

export enum RealizationFilterType {
    REALIZATION_INDEX = "realizationIndex",
}
export const RealizationFilterTypeStringMapping = {
    [RealizationFilterType.REALIZATION_INDEX]: "Realization index",
};

export enum IncludeExcludeFilter {
    INCLUDE_FILTER = "includeFilter",
    EXCLUDE_FILTER = "excludeFilter",
}
export const IncludeExcludeFilterEnumToStringMapping = {
    [IncludeExcludeFilter.INCLUDE_FILTER]: "Include Filter",
    [IncludeExcludeFilter.EXCLUDE_FILTER]: "Exclude Filter",
};

export type IndexRange = { start: number; end: number };
export type RealizationIndexSelection = IndexRange | number;

export class RealizationFilter {
    private _assignedEnsemble: Ensemble;
    private _includeExcludeFilter: IncludeExcludeFilter;
    private _filterType: RealizationFilterType;

    private _realizationIndexSelections: readonly RealizationIndexSelection[] | null;

    // Internal array for ref stability
    private _filteredRealizations: readonly number[];

    constructor(
        assignedEnsemble: Ensemble,
        initialIncludeExcludeFilter = IncludeExcludeFilter.INCLUDE_FILTER,
        initialFilterType = RealizationFilterType.REALIZATION_INDEX
    ) {
        this._assignedEnsemble = assignedEnsemble;
        this._includeExcludeFilter = initialIncludeExcludeFilter;
        this._filterType = initialFilterType;
        this._filteredRealizations = assignedEnsemble.getRealizations();

        this._realizationIndexSelections = null;
    }

    getAssignedEnsembleIdent(): EnsembleIdent {
        return this._assignedEnsemble.getIdent();
    }

    setRealizationIndexSelections(selections: readonly RealizationIndexSelection[] | null): void {
        this._realizationIndexSelections = selections;

        // Update internal array if resulting realizations has changed
        if (this._filterType === RealizationFilterType.REALIZATION_INDEX) {
            this.runSelectedRealizationIndexFiltering();
        }
    }

    getRealizationIndexSelections(): readonly RealizationIndexSelection[] | null {
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
        if (this._filterType !== RealizationFilterType.REALIZATION_INDEX) return;

        this.runSelectedRealizationIndexFiltering();
    }

    private runSelectedRealizationIndexFiltering(): void {
        let newFilteredRealizations = this._assignedEnsemble.getRealizations();

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
        const validRealizations = this._assignedEnsemble.getRealizations();

        if (this._includeExcludeFilter === IncludeExcludeFilter.INCLUDE_FILTER) {
            return sourceRealizations.filter((elm) => validRealizations.includes(elm));
        }

        return validRealizations.filter((elm) => !sourceRealizations.includes(elm));
    }
}

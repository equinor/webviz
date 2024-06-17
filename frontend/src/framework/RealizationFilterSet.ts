import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleSet } from "./EnsembleSet";
import { RealizationFilter } from "./RealizationFilter";

export class RealizationFilterSet {
    // Map of ensembleIdent string to RealizationFilter
    private _ensembleIdentStringRealizationFilterMap: Map<string, RealizationFilter> = new Map();

    /**
     * The method is used to synchronize the realization filter set with the ensemble set.
     *
     * Removes filters for ensembles that are no longer in the ensemble set. Adds new default
     * filters for ensembles that are new to the ensemble set. Old are kept unchanged.
     */
    synchronizeWithEnsembleSet(ensembleSet: EnsembleSet): void {
        // Remove filters for ensembles that are no longer in the ensemble set
        for (const ensembleIdentString of this._ensembleIdentStringRealizationFilterMap.keys()) {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            if (!ensembleSet.hasEnsemble(ensembleIdent)) {
                this._ensembleIdentStringRealizationFilterMap.delete(ensembleIdentString);
            }
        }

        // Add filters for ensembles that are new to the ensemble set
        for (const ensemble of ensembleSet.getEnsembleArr()) {
            const ensembleIdentString = ensemble.getIdent().toString();
            const isEnsembleInMap = this._ensembleIdentStringRealizationFilterMap.has(ensembleIdentString);
            if (!isEnsembleInMap) {
                this._ensembleIdentStringRealizationFilterMap.set(ensembleIdentString, new RealizationFilter(ensemble));
            }
        }
    }

    /**
     * Get filter for ensembleIdent
     */
    getRealizationFilterForEnsembleIdent(ensembleIdent: EnsembleIdent): RealizationFilter {
        const filter = this._ensembleIdentStringRealizationFilterMap.get(ensembleIdent.toString());
        if (filter === undefined) {
            throw new Error(
                `We expect all ensembles to have a filter instance. No filter found for ${ensembleIdent.toString()}`
            );
        }

        return filter;
    }

    isEqual(other: RealizationFilterSet): boolean {
        if (
            this._ensembleIdentStringRealizationFilterMap.size !== other._ensembleIdentStringRealizationFilterMap.size
        ) {
            return false;
        }

        for (const [ensembleIdentString, realizationFilter] of this._ensembleIdentStringRealizationFilterMap) {
            const otherRealizationFilter = other._ensembleIdentStringRealizationFilterMap.get(ensembleIdentString);
            if (!otherRealizationFilter || isEqual(realizationFilter, otherRealizationFilter)) {
                return false;
            }
        }

        return true;
    }
}

import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleSet } from "./EnsembleSet";
import { RealizationFilter } from "./RealizationFilter";

export class RealizationFilterSet2 {
    // With EnsembleIdent as key in map.
    // Results in difficult as EnsembleIdent is not a primitive type and checks compares reference
    // equality instead of value equality.

    private _ensembleRealizationFilterMap: Map<EnsembleIdent, RealizationFilter> = new Map();
    // constructor(ensembleSet: EnsembleSet, oldRealizationFilters: RealizationFilter[]) {
    //     // TODO: Consider if this should be on construction or in a synchronize method
    //     for (const ensemble of ensembleSet.getEnsembleArr()) {
    //         const oldRealizationFilter = oldRealizationFilters.find((filter) =>
    //             filter.getParentEnsembleIdent().equals(ensemble.getIdent())
    //         );
    //         if (oldRealizationFilter) {
    //             this._ensembleRealizationFilterMap.set(ensemble.getIdent(), oldRealizationFilter);
    //         } else {
    //             this._ensembleRealizationFilterMap.set(ensemble.getIdent(), new RealizationFilter(ensemble));
    //         }
    //     }
    // }
    constructor() {
        return;
    }

    private hasEnsembleIdent(ensembleIdent: EnsembleIdent): boolean {
        return (
            Array.from(this._ensembleRealizationFilterMap.keys()).find((key) => key.equals(ensembleIdent)) !== undefined
        );
    }

    synchronizeWithEnsembleSet(ensembleSet: EnsembleSet): void {
        // Remove filters for ensembles that are no longer in the ensemble set
        for (const ensembleIdent of this._ensembleRealizationFilterMap.keys()) {
            if (!ensembleSet.hasEnsemble(ensembleIdent)) {
                this._ensembleRealizationFilterMap.delete(ensembleIdent);
            }
        }

        // Add filters for ensembles that are new to the ensemble set
        for (const ensemble of ensembleSet.getEnsembleArr()) {
            const isEnsembleInMap = this.hasEnsembleIdent(ensemble.getIdent());
            if (!isEnsembleInMap) {
                this._ensembleRealizationFilterMap.set(ensemble.getIdent(), new RealizationFilter(ensemble));
            }
        }
    }

    getRealizationFilterByEnsembleIdent(ensembleIdent: EnsembleIdent): RealizationFilter | null {
        for (const [key, value] of this._ensembleRealizationFilterMap.entries()) {
            if (key.equals(ensembleIdent)) {
                return value;
            }
        }
        return null;
    }
}

export class RealizationFilterSet {
    // With EnsembleIdent strings as key in map.
    // Results in easier comparison but requires EnsembleIdent to be converted to string and back.

    // Map of ensembleIdent string to RealizationFilter
    private _ensembleRealizationFilterMap: Map<string, RealizationFilter> = new Map();

    // constructor(ensembleSet: EnsembleSet, oldRealizationFilters: RealizationFilter[]) {
    //     // TODO: Consider if this should be on construction or in a synchronize method
    //     for (const ensemble of ensembleSet.getEnsembleArr()) {
    //         const oldRealizationFilter = oldRealizationFilters.find((filter) =>
    //             filter.getParentEnsembleIdent().equals(ensemble.getIdent())
    //         );
    //         if (oldRealizationFilter) {
    //             this._ensembleRealizationFilterMap.set(ensemble.getIdent(), oldRealizationFilter);
    //         } else {
    //             this._ensembleRealizationFilterMap.set(ensemble.getIdent(), new RealizationFilter(ensemble));
    //         }
    //     }
    // }
    constructor() {
        return;
    }

    /**
     * The method is used to synchronize the realization filter set with the ensemble set.
     *
     * Removes filters for ensembles that are no longer in the ensemble set. Adds new default
     * filters for ensembles that are new to the ensemble set. Old are kept unchanged.
     */
    synchronizeWithEnsembleSet(ensembleSet: EnsembleSet): void {
        // Remove filters for ensembles that are no longer in the ensemble set
        for (const ensembleIdentString of this._ensembleRealizationFilterMap.keys()) {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            if (!ensembleSet.hasEnsemble(ensembleIdent)) {
                this._ensembleRealizationFilterMap.delete(ensembleIdentString);
            }
        }

        // Add filters for ensembles that are new to the ensemble set
        for (const ensemble of ensembleSet.getEnsembleArr()) {
            const ensembleIdentString = ensemble.getIdent().toString();
            const isEnsembleInMap = this._ensembleRealizationFilterMap.has(ensembleIdentString);
            if (!isEnsembleInMap) {
                this._ensembleRealizationFilterMap.set(ensembleIdentString, new RealizationFilter(ensemble));
            }
        }
    }

    /**
     * Get filter for ensembleIdent
     */
    getRealizationFilterByEnsembleIdent(ensembleIdent: EnsembleIdent): RealizationFilter | null {
        const filter = this._ensembleRealizationFilterMap.get(ensembleIdent.toString());
        // if (filter === undefined) {
        //     throw new Error(
        //         `We expect all ensembles to have a filter instance. No filter found for ${ensembleIdent.toString()}`
        //     );
        // }

        return filter ?? null;
    }
}

import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import type { EnsembleSet } from "./EnsembleSet";
import { RealizationFilter, realizationFilterSchema, type SerializedRealizationFilter } from "./RealizationFilter";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";

import type { JTDSchemaType } from "ajv/dist/jtd";

export type SerializedRealizationFilterSet = Array<{
    ensembleIdentString: string;
    realizationFilter: SerializedRealizationFilter;
}>;

export const realizationFilterSetSchema: JTDSchemaType<SerializedRealizationFilterSet> = {
    elements: {
        properties: {
            ensembleIdentString: { type: "string" },
            realizationFilter: realizationFilterSchema,
        },
    },
} as const;

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
            let ensembleIdent = null;
            if (RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
                ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
            } else if (DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
                ensembleIdent = DeltaEnsembleIdent.fromString(ensembleIdentString);
            }
            if (!ensembleIdent) {
                throw new Error(`Invalid ensemble ident string: ${ensembleIdentString}`);
            }

            if (!ensembleSet.hasEnsemble(ensembleIdent)) {
                this._ensembleIdentStringRealizationFilterMap.delete(ensembleIdentString);
            }
        }

        // Add filters for ensembles that are new to the ensemble set
        for (const ensemble of ensembleSet.getEnsembleArray()) {
            const ensembleIdentString = ensemble.getIdent().toString();
            const isEnsembleInMap = this._ensembleIdentStringRealizationFilterMap.has(ensembleIdentString);
            if (!isEnsembleInMap) {
                const filter = new RealizationFilter(ensemble);
                this._ensembleIdentStringRealizationFilterMap.set(ensembleIdentString, filter);
            }
        }
    }

    serialize(): SerializedRealizationFilterSet {
        const serialized: SerializedRealizationFilterSet = [];
        for (const [ensembleIdentString, realizationFilter] of this._ensembleIdentStringRealizationFilterMap) {
            serialized.push({
                ensembleIdentString,
                realizationFilter: realizationFilter.serialize(),
            });
        }
        return serialized;
    }

    deserialize(input: SerializedRealizationFilterSet): void {
        for (const filter of this._ensembleIdentStringRealizationFilterMap.values()) {
            const serializedFilter = input.find(
                (item) => item.ensembleIdentString === filter.getAssignedEnsembleIdent().toString(),
            )?.realizationFilter;

            if (serializedFilter) {
                filter.deserialize(serializedFilter);
            }
        }
    }

    /**
     * Get filter for ensembleIdent
     */
    getRealizationFilterForEnsembleIdent(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): RealizationFilter {
        const filter = this._ensembleIdentStringRealizationFilterMap.get(ensembleIdent.toString());
        if (filter === undefined) {
            throw new Error(
                `We expect all ensembles to have a filter instance. No filter found for ${ensembleIdent.toString()}`,
            );
        }

        return filter;
    }
}

import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult } from "@tanstack/react-query";

// ------------- CLASS IMPLEMENTATION UTILS -------------

export class EnsembleVectorDescriptionHelper {
    private _ensembleIdents: EnsembleIdent[];
    private _queries: UseQueryResult<VectorDescription_api[]>[];

    constructor(ensembles: EnsembleIdent[], vectorDescriptionQueryResults: UseQueryResult<VectorDescription_api[]>[]) {
        if (ensembles.length !== vectorDescriptionQueryResults.length) {
            throw new Error("Number of ensembles and vector description query results must be equal");
        }

        this._ensembleIdents = ensembles;
        this._queries = vectorDescriptionQueryResults;
    }

    isVectorInEnsemble(ensemble: EnsembleIdent, vector: string) {
        const index = this._ensembleIdents.indexOf(ensemble);

        if (!this._queries[index].data) return false;

        return this._queries[index].data?.some((vectorDescription) => vectorDescription.name === vector);
    }
}

// ------------- FUNCTIONAL UTILS -------------

export type EnsembleIdentAndVectorDescriptionMap = Map<EnsembleIdent, VectorDescription_api[]>;

/**
 *
 * @param ensembles - Array of EnsembleIdents
 * @param vectorListQueryResults - Array of query results
 * @returns Map of EnsembleIdent to VectorDescription_api[] for queries with data results. Undefined data is not included
 */
export function createEnsembleIdentAndVectorDescriptionMap(
    ensembles: EnsembleIdent[],
    vectorListQueryResults: UseQueryResult<VectorDescription_api[]>[]
): EnsembleIdentAndVectorDescriptionMap {
    if (ensembles.length !== vectorListQueryResults.length) {
        throw new Error("Number of ensembles and vector list query results must be equal");
    }

    const map = new Map<EnsembleIdent, VectorDescription_api[]>();
    for (let i = 0; i < ensembles.length; ++i) {
        map.set(ensembles[i], vectorListQueryResults[i].data ?? []);
    }
    return map;
}

/**
 *
 * @param map - Map of EnsembleIdent and its vectors
 * @param ensemble - EnsembleIdent to check
 * @param vector - Vector name to look for
 * @returns True if ensemble is found in map and vector is found for ensemble, false otherwise.
 */
export function isEnsembleAndVectorInMap(
    map: EnsembleIdentAndVectorDescriptionMap,
    ensemble: EnsembleIdent,
    vector: string
) {
    const vectorList = map.get(ensemble);
    if (!vectorList) return false;

    return vectorList.some((elm) => elm.name === vector);
}

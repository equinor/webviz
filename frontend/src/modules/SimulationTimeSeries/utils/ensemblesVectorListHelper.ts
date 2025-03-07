import type { VectorDescription_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Helper class for working with ensembles and corresponding vector list query results
 *
 * Assuming that the order of ensembles and queries is the same
 */
export class EnsembleVectorListsHelper {
    private _ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    private _queries: UseQueryResult<VectorDescription_api[]>[];

    constructor(
        ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
        vectorListQueryResults: UseQueryResult<VectorDescription_api[]>[],
    ) {
        if (ensembleIdents.length !== vectorListQueryResults.length) {
            throw new Error("Number of ensembles and vector list query results must be equal");
        }

        this._ensembleIdents = ensembleIdents;
        this._queries = vectorListQueryResults;
    }

    /**
     * Get number of queries with data results
     *
     * @returns Number of queries with data results
     */
    numberOfQueriesWithData(): number {
        return this._queries.filter((query) => query.data).length;
    }

    /**
     * Get union of vector names from all queries
     *
     * @returns Array of unique vector names, as union of all vectors in all queries
     */
    vectorNamesUnion(): string[] {
        const uniqueVectorNames = new Set<string>();
        for (const query of this._queries) {
            if (query.data) {
                for (const vector of query.data) {
                    uniqueVectorNames.add(vector.name);
                }
            }
        }

        return Array.from(uniqueVectorNames);
    }

    /**
     * Get union of vector descriptions from all queries
     *
     * If duplicate vector names exist, this will keep the first occurrence of the vector description
     *
     * @returns Array of unique vector descriptions, as union of all vectors in all queries
     */
    vectorsUnion(): VectorDescription_api[] {
        const vectorDescriptionMap = new Map<string, VectorDescription_api>();
        for (const query of this._queries) {
            if (query.data) {
                for (const vector of query.data) {
                    // Note: This will keep the first vector with the same name,
                    // i.e. if vectors are different in different ensembles, only the first one will be kept
                    if (!vectorDescriptionMap.has(vector.name)) {
                        vectorDescriptionMap.set(vector.name, vector);
                    }
                }
            }
        }

        return Array.from(vectorDescriptionMap.values());
    }

    /**
     * Check if vector is in the requested ensembles
     *
     * @param ensembleIdent - RegularEnsembleIdent or DeltaEnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns True if vector is in the ensemble query data, false otherwise
     */
    isVectorInEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent, vector: string): boolean {
        const index = this.findIndexOfEnsembleIdent(ensembleIdent);

        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector) ?? false;
    }

    /**
     * Check if vector has historical vector in the ensemble
     *
     * @param ensembleIdent - RegularEnsembleIdent or DeltaEnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns True if vector has historical vector in the ensemble query data, false otherwise
     */
    hasHistoricalVector(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent, vector: string): boolean {
        if (!this.isVectorInEnsemble(ensembleIdent, vector)) return false;

        const index = this.findIndexOfEnsembleIdent(ensembleIdent);
        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector && vec.hasHistorical) ?? false;
    }

    /**
     * Check if provided vector has historical vector in one or more of the ensembles
     *
     * @param vectors - Array of vector names to look for
     * @returns True if one or more of the vectors has historical vector in one or more of the ensembles, false otherwise
     */
    hasAnyHistoricalVector(vectors: string[]): boolean {
        return this._ensembleIdents.some((ensemble) =>
            vectors.some((vector) => this.hasHistoricalVector(ensemble, vector)),
        );
    }

    /**
     * Find index of the provided ensemble ident in the list of ensembles
     * @param ensembleIdent - RegularEnsembleIdent or DeltaEnsembleIdent to find
     * @returns Index of the ensemble ident in the list, or -1 if not found
     */
    private findIndexOfEnsembleIdent(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): number {
        return this._ensembleIdents.findIndex((ident) => {
            return ident.equals(ensembleIdent);
        });
    }
}

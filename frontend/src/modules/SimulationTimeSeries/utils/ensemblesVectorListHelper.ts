import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult } from "@tanstack/react-query";

/**
 * Helper class for working with ensembles and corresponding vector list query results
 */
export class EnsembleVectorListsHelper {
    private _ensembleIdents: EnsembleIdent[];
    private _queries: UseQueryResult<VectorDescription_api[]>[];

    constructor(ensembles: EnsembleIdent[], vectorListQueryResults: UseQueryResult<VectorDescription_api[]>[]) {
        if (ensembles.length !== vectorListQueryResults.length) {
            throw new Error("Number of ensembles and vector list query results must be equal");
        }

        this._ensembleIdents = ensembles;
        this._queries = vectorListQueryResults;
    }

    /**
     *
     * @returns Number of queries with data results
     */
    numberOfQueriesWithData(): number {
        return this._queries.filter((query) => query.data).length;
    }

    /**
     *
     * @returns Array of unique vector names, as union of all vectors in all queries
     */
    vectorsUnion(): string[] {
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
     *
     * @param ensemble - EnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns
     */
    isVectorInEnsemble(ensemble: EnsembleIdent, vector: string): boolean {
        const index = this._ensembleIdents.indexOf(ensemble);

        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector) ?? false;
    }

    /**
     *
     * @param ensemble - EnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns
     */
    hasHistoricalVector(ensemble: EnsembleIdent, vector: string): boolean {
        if (!this.isVectorInEnsemble(ensemble, vector)) return false;

        const index = this._ensembleIdents.indexOf(ensemble);
        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector && vec.has_historical) ?? false;
    }

    /**
     *
     * @param vectors - Array of vector names to look for
     * @returns True if one or more of the vectors has historical vector in one or more of the ensembles, false otherwise
     */
    hasAnyHistoricalVector(vectors: string[]): boolean {
        return this._ensembleIdents.some((ensemble) =>
            vectors.some((vector) => this.hasHistoricalVector(ensemble, vector))
        );
    }
}

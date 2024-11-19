import { VectorDescription_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult } from "@tanstack/react-query";

/**
 * Helper class for working with ensembles and corresponding vector list query results
 */
export class EnsembleVectorListsHelper {
    private _ensembleIdents: (EnsembleIdent | DeltaEnsembleIdent)[];
    private _queries: UseQueryResult<VectorDescription_api[]>[];

    constructor(
        ensembleIdents: (EnsembleIdent | DeltaEnsembleIdent)[],
        vectorListQueryResults: UseQueryResult<VectorDescription_api[]>[]
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
     * Check if vector is in the requested ensembles
     *
     * @param ensembleIdent - EnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns True if vector is in the ensemble query data, false otherwise
     */
    isVectorInEnsemble(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent, vector: string): boolean {
        const index = this.findIndexOfEnsembleIdent(ensembleIdent);

        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector) ?? false;
    }

    /**
     * Check if vector has historical vector in the ensemble
     *
     * @param ensembleIdent - EnsembleIdent to check
     * @param vector - Vector name to look for
     * @returns True if vector has historical vector in the ensemble query data, false otherwise
     */
    hasHistoricalVector(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent, vector: string): boolean {
        if (!this.isVectorInEnsemble(ensembleIdent, vector)) return false;

        const index = this.findIndexOfEnsembleIdent(ensembleIdent);
        if (index === -1 || !this._queries[index].data) return false;

        return this._queries[index].data?.some((vec) => vec.name === vector && vec.has_historical) ?? false;
    }

    /**
     * Check if provided vector has historical vector in one or more of the ensembles
     *
     * @param vectors - Array of vector names to look for
     * @returns True if one or more of the vectors has historical vector in one or more of the ensembles, false otherwise
     */
    hasAnyHistoricalVector(vectors: string[]): boolean {
        return this._ensembleIdents.some((ensemble) =>
            vectors.some((vector) => this.hasHistoricalVector(ensemble, vector))
        );
    }

    /**
     * Find index of the provided ensemble ident in the list of ensembles
     * @param ensembleIdent - EnsembleIdent or DeltaEnsembleIdent to find
     * @returns Index of the ensemble ident in the list, or -1 if not found
     */
    private findIndexOfEnsembleIdent(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent): number {
        return this._ensembleIdents.findIndex((ident) => {
            if (ensembleIdent instanceof EnsembleIdent && ident instanceof EnsembleIdent) {
                return ident.equals(ensembleIdent);
            }
            if (ensembleIdent instanceof DeltaEnsembleIdent && ident instanceof DeltaEnsembleIdent) {
                return ident.equals(ensembleIdent);
            }
            return false;
        });
    }
}

import { VectorDescription_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

/**
 * Helper class for working with ensembles and corresponding vector list query results
 *
 * Assuming that the order of ensembles and queries is the same
 */
export class EnsembleVectorListsHelper {
    private _ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    private _data: (VectorDescription_api[] | null)[];

    constructor(
        ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
        queryData: (VectorDescription_api[] | null)[]
    ) {
        if (ensembleIdents.length !== queryData.length) {
            throw new Error("Number of ensembles and vector list query results must be equal");
        }

        this._ensembleIdents = ensembleIdents;
        this._data = queryData;
    }

    /**
     * Get number of queries with data results
     *
     * @returns Number of queries with data results
     */
    numberOfQueriesWithData(): number {
        return this._data.filter((d) => d).length;
    }

    /**
     * Get union of vector names from all queries
     *
     * @returns Array of unique vector names, as union of all vectors in all queries
     */
    vectorsUnion(): string[] {
        const uniqueVectorNames = new Set<string>();
        for (const data of this._data) {
            if (data) {
                for (const vector of data) {
                    uniqueVectorNames.add(vector.name);
                }
            }
        }

        return Array.from(uniqueVectorNames);
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

        if (index === -1 || !this._data[index]) return false;

        return this._data[index]?.some((vec) => vec.name === vector) ?? false;
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
        if (index === -1 || !this._data[index]) return false;

        return this._data[index]?.some((vec) => vec.name === vector && vec.has_historical) ?? false;
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
     * @param ensembleIdent - RegularEnsembleIdent or DeltaEnsembleIdent to find
     * @returns Index of the ensemble ident in the list, or -1 if not found
     */
    private findIndexOfEnsembleIdent(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): number {
        return this._ensembleIdents.findIndex((ident) => {
            return ident.equals(ensembleIdent);
        });
    }
}

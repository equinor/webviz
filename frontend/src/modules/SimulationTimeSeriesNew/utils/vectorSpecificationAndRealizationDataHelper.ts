import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult } from "@tanstack/react-query";

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

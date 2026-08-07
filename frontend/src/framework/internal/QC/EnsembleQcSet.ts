import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleQc } from "./EnsembleQc";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { QueryClient } from "@tanstack/query-core";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { SerializedEnsembleQcSetState } from "./EnsembleQcSet.schema";

export class EnsembleQcSet {
    private _ensembleIdentStringQcMap: Map<string, EnsembleQc> = new Map();

    synchronizeWithEnsembleSet(ensembleSet: EnsembleSet, queryClient: QueryClient): void {
        // Remove QCs for ensembles that are no longer in the ensemble set
        for (const ensembleIdentString of this._ensembleIdentStringQcMap.keys()) {
            let ensembleIdent = null;
            if (RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
                ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
            }

            if (!ensembleIdent) {
                throw new Error(`Invalid ensemble ident string: ${ensembleIdentString}`);
            }

            if (!ensembleSet.hasEnsemble(ensembleIdent)) {
                this._ensembleIdentStringQcMap.delete(ensembleIdentString);
            }
        }

        // Add QCs for ensembles that are new to the ensemble set
        for (const ensemble of ensembleSet.getRegularEnsembleArray()) {
            const ensembleIdentString = ensemble.getIdent().toString();
            const isEnsembleInMap = this._ensembleIdentStringQcMap.has(ensembleIdentString);
            if (!isEnsembleInMap) {
                const qc = new EnsembleQc(ensemble, queryClient);
                this._ensembleIdentStringQcMap.set(ensembleIdentString, qc);
            }
        }
    }

    getEnsembleQcsArray(): Array<EnsembleQc> {
        return Array.from(this._ensembleIdentStringQcMap.values());
    }

    serializeState(): SerializedEnsembleQcSetState {
        const serialized: SerializedEnsembleQcSetState = [];
        for (const [ensembleIdentString, ensembleQc] of this._ensembleIdentStringQcMap) {
            serialized.push({
                ensembleIdentString,
                ensembleQc: ensembleQc.serializeState(),
            });
        }
        return serialized;
    }

    deserializeState(input: SerializedEnsembleQcSetState) {
        // no-op for now
    }
}

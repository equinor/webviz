import type { QueryClient } from "@tanstack/query-core";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { EnsembleQc } from "./EnsembleQc";
import type { SerializedEnsembleQcSetState } from "./EnsembleQcSet.schema";

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
                this._ensembleIdentStringQcMap.get(ensembleIdentString)?.beforeDestroy();
                this._ensembleIdentStringQcMap.delete(ensembleIdentString);
            }
        }

        // Add QCs for ensembles that are new to the ensemble set. The ensemble set is rebuilt with new
        // instances whenever the ensemble selection is applied, so retained QCs get the new instance too
        for (const ensemble of ensembleSet.getRegularEnsembleArray()) {
            const ensembleIdentString = ensemble.getIdent().toString();
            const existingQc = this._ensembleIdentStringQcMap.get(ensembleIdentString);
            if (existingQc) {
                existingQc.setEnsemble(ensemble);
            } else {
                const qc = new EnsembleQc(ensemble, queryClient);
                this._ensembleIdentStringQcMap.set(ensembleIdentString, qc);
            }
        }
    }

    getEnsembleQcsArray(): Array<EnsembleQc> {
        return Array.from(this._ensembleIdentStringQcMap.values());
    }

    clear(): void {
        for (const ensembleQc of this._ensembleIdentStringQcMap.values()) {
            ensembleQc.beforeDestroy();
        }
        this._ensembleIdentStringQcMap.clear();
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
        void input; // currently a no-op, just to acknowledge the parameter
    }
}

import type { QueryClient } from "@tanstack/react-query";

import type { RegularEnsemble } from "@framework/RegularEnsemble";

import { QcCheckRuntime } from "./QcCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";
import { SerializedEnsembleQcState } from "./EnsembleQc.schema";

export class EnsembleQc {
    private _checks: Map<string, QcCheckRuntime> = new Map<string, QcCheckRuntime>();
    private _ensemble: RegularEnsemble;

    constructor(ensemble: RegularEnsemble, queryClient: QueryClient) {
        this._ensemble = ensemble;
        for (const [id, checkDefinition] of QcCheckRegistry.getRegisteredChecks()) {
            const checkRuntime = new QcCheckRuntime(id, checkDefinition, this._ensemble, queryClient);
            this._checks.set(id, checkRuntime);
        }
    }

    getEnsemble(): RegularEnsemble {
        return this._ensemble;
    }

    getCheckRuntimes(): Map<string, QcCheckRuntime> {
        return this._checks;
    }

    serializeState(): SerializedEnsembleQcState {
        return {
            ensembleIdentString: this._ensemble.getIdent().toString(),
        };
    }
}

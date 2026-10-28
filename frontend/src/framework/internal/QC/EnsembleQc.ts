import type { QueryClient } from "@tanstack/react-query";

import type { RegularEnsemble } from "@framework/RegularEnsemble";

import type { SerializedEnsembleQcState } from "./EnsembleQc.schema";
import { QcCheckRuntime } from "./QcCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

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

    /** Swaps in a rebuilt instance of the same ensemble, keeping every check's results. */
    setEnsemble(ensemble: RegularEnsemble): void {
        this._ensemble = ensemble;
        for (const checkRuntime of this._checks.values()) {
            checkRuntime.setEnsemble(ensemble);
        }
    }

    getCheckRuntimes(): Map<string, QcCheckRuntime> {
        return this._checks;
    }

    beforeDestroy(): void {
        for (const checkRuntime of this._checks.values()) {
            checkRuntime.cancel();
        }
    }

    serializeState(): SerializedEnsembleQcState {
        return {
            ensembleIdentString: this._ensemble.getIdent().toString(),
        };
    }
}

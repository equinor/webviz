import type { EnsembleQcSet } from "@framework/internal/QC/EnsembleQcSet";
import type { QcCheckDefinition, QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import type { QcCheckStepDefinition } from "@framework/internal/QC/QcCheckStep";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

/**
 * A check whose only step blocks on a fetch that never resolves on its own, so it keeps running until cancelled.
 * The error each fetch ends with is pushed to `fetchErrors` - lets a test tell a cancelled check apart from one
 * left running.
 */
export function makeBlockingCheck(fetchErrors: unknown[]): QcCheckDefinition<void> {
    const blockingStep: QcCheckStepDefinition<void, void> = {
        name: "Blocking step",
        async run(context) {
            try {
                await context.fetchQuery({
                    queryKey: ["blocking-step", context.ensemble.getIdent().toString()],
                    queryFn: () => new Promise<never>(() => {}),
                });
            } catch (error) {
                fetchErrors.push(error);
            }
        },
    };

    return {
        name: "Blocking check",
        defaultParams: undefined,
        steps: [blockingStep],
    };
}

export function getQcEnsembleIdentStrings(qcSet: EnsembleQcSet): string[] {
    return qcSet.getEnsembleQcsArray().map((ensembleQc) => ensembleQc.getEnsemble().getIdent().toString());
}

export function getCheckRuntime(qcSet: EnsembleQcSet, ensemble: RegularEnsemble, checkId: string): QcCheckRuntime {
    const ensembleQc = qcSet
        .getEnsembleQcsArray()
        .find((qc) => qc.getEnsemble().getIdent().equals(ensemble.getIdent()));
    const checkRuntime = ensembleQc?.getCheckRuntimes().get(checkId);
    if (!checkRuntime) {
        throw new Error(`No runtime for check ${checkId} on ${ensemble.getIdent().toString()}`);
    }
    return checkRuntime;
}

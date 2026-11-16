import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";

import { makeDistinguishableEnsembleDisplayName } from "./ensembleNameUtils";

/** Matching realization numbers do not guarantee that both ensembles represent the same samples. */
export function makeDeltaRealizationAlignmentWarnings(
    ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
    ensembleSet: EnsembleSet,
): string[] {
    return filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent).map(function makeAlignmentWarning(ident) {
        const name = makeDistinguishableEnsembleDisplayName(ident, ensembleSet.getEnsembleArray());
        return (
            `Delta ensemble "${name}" pairs comparison and reference by realization number. ` +
            "Distribution statistics are only meaningful when those realizations represent aligned samples."
        );
    });
}

/** Warn when only some realizations are shared by the two source ensembles. */
export function makeDeltaRealizationCountWarnings(
    ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
    ensembleSet: EnsembleSet,
): string[] {
    const warnings: string[] = [];
    for (const ident of filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent)) {
        const delta = ensembleSet.findEnsemble(ident);
        const comparison = ensembleSet.findEnsemble(ident.getComparisonEnsembleIdent());
        const reference = ensembleSet.findEnsemble(ident.getReferenceEnsembleIdent());
        if (!delta || !comparison || !reference) {
            continue;
        }
        const sharedCount = delta.getRealizations().length;
        const largestSourceCount = Math.max(comparison.getRealizations().length, reference.getRealizations().length);
        if (sharedCount < largestSourceCount) {
            const name = makeDistinguishableEnsembleDisplayName(ident, ensembleSet.getEnsembleArray());
            warnings.push(
                `Delta ensemble "${name}": using the ${sharedCount} realizations shared by the comparison and reference ensembles.`,
            );
        }
    }
    return warnings;
}

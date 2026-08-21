import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";

import type { DeltaDroppedFluidSelections } from "./types";

/**
 * Warnings for delta ensembles whose constituents do not share all realizations.
 *
 * The per-realization difference keeps only the shared realizations, which reduces the sample size
 * behind every statistic derived from it.
 */
export function makeDeltaRealizationCountWarnings(
    ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
    ensembleSet: EnsembleSet,
): string[] {
    const warnings: string[] = [];

    for (const deltaEnsembleIdent of filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent)) {
        const deltaEnsemble = ensembleSet.findEnsemble(deltaEnsembleIdent);
        const comparisonEnsemble = ensembleSet.findEnsemble(deltaEnsembleIdent.getComparisonEnsembleIdent());
        const referenceEnsemble = ensembleSet.findEnsemble(deltaEnsembleIdent.getReferenceEnsembleIdent());
        if (!deltaEnsemble || !comparisonEnsemble || !referenceEnsemble) {
            continue;
        }

        const sharedRealizationCount = deltaEnsemble.getRealizations().length;
        const largestConstituentRealizationCount = Math.max(
            comparisonEnsemble.getRealizations().length,
            referenceEnsemble.getRealizations().length,
        );
        if (sharedRealizationCount < largestConstituentRealizationCount) {
            warnings.push(
                `Delta ensemble "${deltaEnsembleIdent.getEnsembleName()}": using the ${sharedRealizationCount} realizations shared by the comparison and reference ensembles.`,
            );
        }
    }

    return warnings;
}

/**
 * Warnings for fluid selections excluded from a delta because the reference ensemble has no rows for
 * them. Without this the affected volumes simply disappear from the table.
 */
export function makeDroppedFluidSelectionWarnings(droppedFluidSelections: DeltaDroppedFluidSelections[]): string[] {
    return droppedFluidSelections.map(
        (dropped) =>
            `Delta ensemble "${dropped.ensembleIdent.getEnsembleName()}" (${dropped.tableName}): ${dropped.fluidSelections.join(", ")} ` +
            "not present in the reference ensemble, so excluded from the difference.",
    );
}

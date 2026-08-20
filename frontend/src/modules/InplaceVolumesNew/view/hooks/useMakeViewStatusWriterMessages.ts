import { useAtomValue } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { filterAtom } from "../atoms/baseAtoms";
import { indicesWithValuesAtom } from "../atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

const FACIES_FRACTION_RESULT_NAME = "FACIES_FRACTION";
const FACIES_INDEX_COLUMN = "FACIES";

export function useMakeViewStatusWriterMessages(
    statusWriter: ViewStatusWriter,
    ensembleSet: EnsembleSet,
    resultName: string | null,
    subplotBy: string,
    colorBy: string,
) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);
    const indicesWithValues = useAtomValue(indicesWithValuesAtom);
    const filter = useAtomValue(filterAtom);

    usePropagateAllApiErrorsToStatusWriter(queriesResult.errors, statusWriter);

    for (const elm of indicesWithValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.indexColumn.valueOf()}`);
        }
    }

    // The per-realization difference drops realizations missing from either constituent, which
    // reduces the sample size behind every statistic shown.
    const deltaEnsembleIdents = filterEnsembleIdentsByType(filter?.ensembleIdents ?? [], DeltaEnsembleIdent);
    for (const deltaEnsembleIdent of deltaEnsembleIdents) {
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
            statusWriter.addWarning(
                `Delta ensemble "${deltaEnsembleIdent.getEnsembleName()}": using the ${sharedRealizationCount} realizations shared by the comparison and reference ensembles.`,
            );
        }
    }

    if (
        resultName === FACIES_FRACTION_RESULT_NAME &&
        subplotBy !== FACIES_INDEX_COLUMN &&
        colorBy !== FACIES_INDEX_COLUMN
    ) {
        statusWriter.addWarning(
            "FACIES_FRACTION is only meaningful when FACIES is used as Subplot by or Color by; otherwise every fraction collapses to 1.",
        );
    }
}

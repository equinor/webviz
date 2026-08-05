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

function haveEqualRealizationSets(a: readonly number[], b: readonly number[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    const bSet = new Set(b);
    return a.every((realization) => bSet.has(realization));
}

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

    // Warn when a delta ensemble's constituents are not realization-aligned. The per-realization
    // difference is matched on realization number and is only meaningful when realization N is the
    // same Monte Carlo sample in both ensembles (see DELTA_ENSEMBLE_PLAN.md §9).
    const deltaEnsembleIdents = filterEnsembleIdentsByType(filter?.ensembleIdents ?? [], DeltaEnsembleIdent);
    for (const deltaEnsembleIdent of deltaEnsembleIdents) {
        const comparisonEnsemble = ensembleSet.findEnsemble(deltaEnsembleIdent.getComparisonEnsembleIdent());
        const referenceEnsemble = ensembleSet.findEnsemble(deltaEnsembleIdent.getReferenceEnsembleIdent());
        if (!comparisonEnsemble || !referenceEnsemble) {
            continue;
        }
        if (!haveEqualRealizationSets(comparisonEnsemble.getRealizations(), referenceEnsemble.getRealizations())) {
            statusWriter.addWarning(
                `Delta ensemble "${deltaEnsembleIdent.getEnsembleName()}": the comparison and reference ensembles have different realizations. ` +
                    "The per-realization difference uses only the shared realizations and assumes realization numbers correspond to the same sample.",
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

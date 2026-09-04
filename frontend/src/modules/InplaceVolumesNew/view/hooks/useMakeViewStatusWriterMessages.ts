import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import {
    makeDeltaRealizationAlignmentWarnings,
    makeDeltaRealizationCountWarnings,
    makeDroppedFluidSelectionWarnings,
    makeUnmatchedDeltaRowWarnings,
} from "@modules/_shared/InplaceVolumes/deltaEnsembleWarnings";
import { FLUID_SPECIFIC_RESULT_NAMES, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

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

    for (const warning of makeDeltaRealizationCountWarnings(filter?.ensembleIdents ?? [], ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeDeltaRealizationAlignmentWarnings(filter?.ensembleIdents ?? [])) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeDroppedFluidSelectionWarnings(queriesResult.droppedFluidSelections)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeUnmatchedDeltaRowWarnings(queriesResult.unmatchedRows)) {
        statusWriter.addWarning(warning);
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

    const requiredFluid = resultName !== null ? FLUID_SPECIFIC_RESULT_NAMES[resultName] : undefined;
    if (requiredFluid !== undefined) {
        const selectedFluids =
            indicesWithValues
                .find((elm) => elm.indexColumn === TableOriginKey.FLUID)
                ?.values.map((v) => String(v).toLowerCase()) ?? [];
        if (!selectedFluids.includes(requiredFluid)) {
            statusWriter.addWarning(
                `${resultName} is only defined for the "${requiredFluid}" fluid. Include it in the FLUID filter to see data.`,
            );
        }
    }
}

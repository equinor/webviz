import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import {
    makeDeltaRealizationAlignmentWarnings,
    makeDeltaRealizationCountWarnings,
} from "@modules/_shared/ensembleDeltaWarnings";
import {
    makeDroppedFluidSelectionWarnings,
    makeUnmatchedDeltaRowWarnings,
} from "@modules/_shared/InplaceVolumes/deltaEnsembleWarnings";
import {
    makeDroppedSensitivityRowsWarning,
    makeSensitivityCasesWithoutRealizationsWarning,
    SENSITIVITY_ENSEMBLE_SELECTION_BLOCKED_MESSAGE,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { FLUID_SPECIFIC_RESULT_NAMES, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { propagateAllApiErrorsToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import { filterAtom, isSensitivityEnsembleSelectionBlockedAtom } from "../atoms/baseAtoms";
import { indicesWithValuesAtom, sensitivityCasesWithoutRealizationsAtom } from "../atoms/derivedAtoms";
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
    const isSensitivityEnsembleSelectionBlocked = useAtomValue(isSensitivityEnsembleSelectionBlockedAtom);
    const sensitivityCasesWithoutRealizations = useAtomValue(sensitivityCasesWithoutRealizationsAtom);

    propagateAllApiErrorsToStatusWriter(queriesResult.errors, statusWriter);

    if (isSensitivityEnsembleSelectionBlocked) {
        statusWriter.addError(SENSITIVITY_ENSEMBLE_SELECTION_BLOCKED_MESSAGE);
    }

    if (queriesResult.numDroppedSensitivityRows > 0) {
        statusWriter.addWarning(makeDroppedSensitivityRowsWarning(queriesResult.numDroppedSensitivityRows));
    }

    if (sensitivityCasesWithoutRealizations.length > 0) {
        statusWriter.addWarning(makeSensitivityCasesWithoutRealizationsWarning(sensitivityCasesWithoutRealizations));
    }

    for (const elm of indicesWithValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.indexColumn.valueOf()}`);
        }
    }

    for (const warning of makeDeltaRealizationCountWarnings(filter?.ensembleIdents ?? [], ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeDeltaRealizationAlignmentWarnings(filter?.ensembleIdents ?? [], ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeDroppedFluidSelectionWarnings(queriesResult.droppedFluidSelections, ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeUnmatchedDeltaRowWarnings(queriesResult.unmatchedRows, ensembleSet)) {
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

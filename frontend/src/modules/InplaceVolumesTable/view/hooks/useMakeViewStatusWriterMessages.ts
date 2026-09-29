import { useAtomValue } from "jotai";

import type { InplaceVolumesStatisticalTableData_api, InplaceVolumesTableData_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import {
    makeDeltaRealizationAlignmentWarnings,
    makeDeltaRealizationCountWarnings,
} from "@modules/_shared/ensembleDeltaWarnings";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import {
    makeDroppedFluidSelectionWarnings,
    makeUnmatchedDeltaRowWarnings,
} from "@modules/_shared/InplaceVolumes/deltaEnsembleWarnings";
import { SENSITIVITY_ENSEMBLE_SELECTION_BLOCKED_MESSAGE } from "@modules/_shared/InplaceVolumes/sensitivityUtils";

import { filterAtom, isSensitivityEnsembleSelectionBlockedAtom, resultNamesAtom } from "../atoms/baseAtoms";
import {
    activeQueriesResultAtom,
    indicesWithValuesAtom,
    sensitivityCasesWithoutRealizationsAtom,
} from "../atoms/derivedAtoms";

// Type guard for InplaceVolumesTableData
function isInplaceVolumesTableData(
    obj: InplaceVolumesTableData_api | InplaceVolumesStatisticalTableData_api,
): obj is InplaceVolumesTableData_api {
    return obj && typeof obj === "object" && "resultColumns" in obj;
}

// Type guard for InplaceVolumesStatisticalTableData
function isInplaceVolumesStatisticalTableData(
    obj: InplaceVolumesTableData_api | InplaceVolumesStatisticalTableData_api,
): obj is InplaceVolumesStatisticalTableData_api {
    return obj && typeof obj === "object" && "resultColumnStatistics" in obj;
}

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter, ensembleSet: EnsembleSet) {
    const activeQueriesResult = useAtomValue(activeQueriesResultAtom);
    const indicesValues = useAtomValue(indicesWithValuesAtom);
    const resultNames = useAtomValue(resultNamesAtom);
    const filter = useAtomValue(filterAtom);
    const isSensitivityEnsembleSelectionBlocked = useAtomValue(isSensitivityEnsembleSelectionBlockedAtom);
    const sensitivityCasesWithoutRealizations = useAtomValue(sensitivityCasesWithoutRealizationsAtom);

    usePropagateAllApiErrorsToStatusWriter(activeQueriesResult.errors, statusWriter);

    if (isSensitivityEnsembleSelectionBlocked) {
        statusWriter.addError(SENSITIVITY_ENSEMBLE_SELECTION_BLOCKED_MESSAGE);
    }

    if (activeQueriesResult.numDroppedSensitivityRows > 0) {
        statusWriter.addWarning(
            `${activeQueriesResult.numDroppedSensitivityRows} rows were excluded because their realization belongs to no sensitivity case.`,
        );
    }

    if (sensitivityCasesWithoutRealizations.length > 0) {
        statusWriter.addWarning(
            `No valid realizations for sensitivity cases: ${sensitivityCasesWithoutRealizations.join(", ")}. Check the realization filter.`,
        );
    }

    for (const elm of indicesValues) {
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

    for (const warning of makeDroppedFluidSelectionWarnings(activeQueriesResult.droppedFluidSelections, ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    for (const warning of makeUnmatchedDeltaRowWarnings(activeQueriesResult.unmatchedRows, ensembleSet)) {
        statusWriter.addWarning(warning);
    }

    // Due to no throw in back-end for missing/non-existing result for specific tables, we should compare
    // the retrieved result columns with the requested columns
    for (const tableData of activeQueriesResult.tablesData) {
        // Per unique inplace volumes table (RegularEnsembleIdent, tableName) we have a query result
        const queryData = tableData.data;

        // Result columns across all fluid selections
        const tableResultColumnsUnion = new Set<string>();
        for (const fluidSelectionTable of queryData.tableDataPerFluidSelection) {
            if (isInplaceVolumesTableData(fluidSelectionTable)) {
                fluidSelectionTable.resultColumns.forEach((col) => tableResultColumnsUnion.add(col.columnName));
            }
            if (isInplaceVolumesStatisticalTableData(fluidSelectionTable)) {
                fluidSelectionTable.resultColumnStatistics.forEach((col) =>
                    tableResultColumnsUnion.add(col.columnName),
                );
            }
        }

        // Find result name missing in the result columns
        const missingResultNames = resultNames.filter((result) => !tableResultColumnsUnion.has(result));

        // List missing result names for specific table. Note fluid selection is not considered here, as
        // the result columns will be visible in the table component if they are present in any of the fluid selections
        if (missingResultNames.length > 0) {
            statusWriter.addWarning(
                `Missing result names for Table "${tableData.tableName}": ${missingResultNames.join(", ")}`,
            );
        }
    }
}

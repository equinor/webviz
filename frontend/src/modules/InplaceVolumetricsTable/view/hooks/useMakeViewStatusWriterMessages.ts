import { InplaceStatisticalVolumetricTableData_api, InplaceVolumetricTableData_api } from "@api";
import { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { useAtomValue } from "jotai";

import { resultNamesAtom } from "../atoms/baseAtoms";
import { activeQueriesResultAtom, identifiersValuesAtom } from "../atoms/derivedAtoms";

// Type guard for InplaceVolumetricTableData
function isInplaceVolumetricTableData(
    obj: InplaceVolumetricTableData_api | InplaceStatisticalVolumetricTableData_api
): obj is InplaceVolumetricTableData_api {
    return obj && typeof obj === "object" && "resultColumns" in obj;
}

// Type guard for InplaceStatisticalVolumetricTableData
function isInplaceStatisticalVolumetricTableData(
    obj: InplaceVolumetricTableData_api | InplaceStatisticalVolumetricTableData_api
): obj is InplaceStatisticalVolumetricTableData_api {
    return obj && typeof obj === "object" && "resultColumnStatistics" in obj;
}

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const activeQueriesResult = useAtomValue(activeQueriesResultAtom);
    const identifiersValues = useAtomValue(identifiersValuesAtom);
    const resultNames = useAtomValue(resultNamesAtom);

    const errors = activeQueriesResult.errors;

    for (const error of errors) {
        const helper = ApiErrorHelper.fromError(error);
        if (helper) {
            statusWriter.addError(helper.makeStatusMessage());
        }
    }

    for (const elm of identifiersValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.identifier.valueOf()}`);
        }
    }

    // Due to no throw in back-end for missing/non-existing result for specific tables, we should compare
    // the retrieved result columns with the requested columns
    for (const tableData of activeQueriesResult.tablesData) {
        // Per unique volumetric table (EnsembleIdent, tableName) we have a query result
        const queryData = tableData.data;

        // Result columns across all fluid selections
        const tableResultColumnsUnion = new Set<string>();
        for (const fluidSelectionTable of queryData.tableDataPerFluidSelection) {
            if (isInplaceVolumetricTableData(fluidSelectionTable)) {
                fluidSelectionTable.resultColumns.forEach((col) => tableResultColumnsUnion.add(col.columnName));
            }
            if (isInplaceStatisticalVolumetricTableData(fluidSelectionTable)) {
                fluidSelectionTable.resultColumnStatistics.forEach((col) =>
                    tableResultColumnsUnion.add(col.columnName)
                );
            }
        }

        // Find result name missing in the result columns
        const missingResultNames = resultNames.filter((result) => !tableResultColumnsUnion.has(result));

        // List missing result names for specific table. Note fluid selection is not considered here, as
        // the result columns will be visible in the table component if they are present in any of the fluid selections
        if (missingResultNames.length > 0) {
            statusWriter.addWarning(
                `Missing result names for Table "${tableData.tableName}": ${missingResultNames.join(", ")}`
            );
        }
    }
}

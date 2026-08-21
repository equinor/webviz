import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnData_api,
} from "@api";

import { encodeSelectorColumn, expandSelectorColumn, makeRowKey } from "./selectorColumnUtils";

/**
 * Compute the per-realization difference (comparison − reference) for a single fluid selection.
 *
 * Rows are matched on the intersection of their selector columns (including REAL), so only rows
 * present in BOTH ensembles for the same (realization, selectors) tuple are kept (inner join).
 * Result columns are limited to those present in both ensembles.
 */
function subtractFluidSelectionTableData(
    comparison: InplaceVolumesTableData_api,
    reference: InplaceVolumesTableData_api,
): InplaceVolumesTableData_api {
    // Intersection of selector column names, preserving comparison order.
    const referenceSelectorNames = new Set(reference.selectorColumns.map((column) => column.columnName));
    const selectorColumnNames = comparison.selectorColumns
        .map((column) => column.columnName)
        .filter((name) => referenceSelectorNames.has(name));

    // Expand selector columns to per-row values for both ensembles.
    const comparisonSelectorRowValues = new Map<string, (string | number)[]>();
    for (const column of comparison.selectorColumns) {
        comparisonSelectorRowValues.set(column.columnName, expandSelectorColumn(column));
    }
    const referenceSelectorRowValues = new Map<string, (string | number)[]>();
    for (const column of reference.selectorColumns) {
        referenceSelectorRowValues.set(column.columnName, expandSelectorColumn(column));
    }

    // Build a lookup from row key -> reference row index.
    const referenceRowCount = reference.resultColumns[0]?.columnValues.length ?? 0;
    const referenceRowIndexByKey = new Map<string, number>();
    for (let row = 0; row < referenceRowCount; row++) {
        referenceRowIndexByKey.set(makeRowKey(referenceSelectorRowValues, selectorColumnNames, row), row);
    }

    const referenceResultColumnByName = new Map<string, TableColumnData_api>();
    for (const column of reference.resultColumns) {
        referenceResultColumnByName.set(column.columnName, column);
    }

    // Result columns present in both ensembles, preserving comparison order.
    const resultColumnNames = comparison.resultColumns
        .map((column) => column.columnName)
        .filter((name) => referenceResultColumnByName.has(name));

    // Determine matched comparison rows (present in reference) and their reference row index.
    const comparisonRowCount = comparison.resultColumns[0]?.columnValues.length ?? 0;
    const matchedRows: { comparisonRow: number; referenceRow: number }[] = [];
    for (let row = 0; row < comparisonRowCount; row++) {
        const key = makeRowKey(comparisonSelectorRowValues, selectorColumnNames, row);
        const referenceRow = referenceRowIndexByKey.get(key);
        if (referenceRow !== undefined) {
            matchedRows.push({ comparisonRow: row, referenceRow });
        }
    }

    // Rebuild selector columns for the matched rows.
    const deltaSelectorColumns: RepeatedTableColumnData_api[] = selectorColumnNames.map((name) => {
        const comparisonRowValues = comparisonSelectorRowValues.get(name)!;
        const rowValues = matchedRows.map(({ comparisonRow }) => comparisonRowValues[comparisonRow]);
        return encodeSelectorColumn(name, rowValues);
    });

    // Compute delta result columns for the matched rows.
    const comparisonResultColumnByName = new Map<string, TableColumnData_api>();
    for (const column of comparison.resultColumns) {
        comparisonResultColumnByName.set(column.columnName, column);
    }
    const deltaResultColumns: TableColumnData_api[] = resultColumnNames.map((name) => {
        const comparisonValues = comparisonResultColumnByName.get(name)!.columnValues;
        const referenceValues = referenceResultColumnByName.get(name)!.columnValues;
        const columnValues = matchedRows.map(
            ({ comparisonRow, referenceRow }) => comparisonValues[comparisonRow] - referenceValues[referenceRow],
        );
        return { columnName: name, columnValues };
    });

    return {
        fluidSelection: comparison.fluidSelection,
        selectorColumns: deltaSelectorColumns,
        resultColumns: deltaResultColumns,
    };
}

export type DroppedFluidSelection = {
    fluidSelection: string;
    /** The side lacking the fluid selection, so the other side's rows cannot be differenced. */
    missingFrom: "comparison" | "reference";
};

export type DeltaTableResult = {
    data: InplaceVolumesTableDataPerFluidSelection_api;
    /** Fluid selections excluded because only one side has them. */
    droppedFluidSelections: DroppedFluidSelection[];
};

/**
 * Compute the per-realization difference (comparison − reference) for inplace volumes table data.
 *
 * The subtraction is performed per fluid selection and matched per (realization, selector) tuple.
 * Only fluid selections present in both ensembles are included.
 */
export function subtractPerRealizationTables(
    comparisonData: InplaceVolumesTableDataPerFluidSelection_api,
    referenceData: InplaceVolumesTableDataPerFluidSelection_api,
): DeltaTableResult {
    const referenceByFluidSelection = new Map<string, InplaceVolumesTableData_api>();
    for (const fluidTableData of referenceData.tableDataPerFluidSelection) {
        referenceByFluidSelection.set(fluidTableData.fluidSelection, fluidTableData);
    }

    const tableDataPerFluidSelection: InplaceVolumesTableData_api[] = [];
    const droppedFluidSelections: DroppedFluidSelection[] = [];
    const comparisonFluidSelections = new Set<string>();
    for (const comparisonFluidTableData of comparisonData.tableDataPerFluidSelection) {
        comparisonFluidSelections.add(comparisonFluidTableData.fluidSelection);

        const referenceFluidTableData = referenceByFluidSelection.get(comparisonFluidTableData.fluidSelection);
        if (!referenceFluidTableData) {
            droppedFluidSelections.push({
                fluidSelection: comparisonFluidTableData.fluidSelection,
                missingFrom: "reference",
            });
            continue;
        }
        tableDataPerFluidSelection.push(
            subtractFluidSelectionTableData(comparisonFluidTableData, referenceFluidTableData),
        );
    }

    // The inner join also drops reference-only fluid selections, which the loop above never visits.
    for (const referenceFluidTableData of referenceData.tableDataPerFluidSelection) {
        if (!comparisonFluidSelections.has(referenceFluidTableData.fluidSelection)) {
            droppedFluidSelections.push({
                fluidSelection: referenceFluidTableData.fluidSelection,
                missingFrom: "comparison",
            });
        }
    }

    return { data: { tableDataPerFluidSelection }, droppedFluidSelections };
}

const subtractionResultByInputs = new WeakMap<
    InplaceVolumesTableDataPerFluidSelection_api,
    WeakMap<InplaceVolumesTableDataPerFluidSelection_api, DeltaTableResult>
>();

/**
 * `subtractPerRealizationTables` memoized on the identity of both inputs.
 *
 * React Query keeps `data` references stable while the underlying data is unchanged, so this skips
 * the subtraction when a query result object is rebuilt for an unrelated reason such as a fetch
 * state transition. Entries are dropped with their inputs, since the cache is weakly held.
 */
export function subtractPerRealizationTablesMemoized(
    comparisonData: InplaceVolumesTableDataPerFluidSelection_api,
    referenceData: InplaceVolumesTableDataPerFluidSelection_api,
): DeltaTableResult {
    let resultByReferenceData = subtractionResultByInputs.get(comparisonData);
    if (!resultByReferenceData) {
        resultByReferenceData = new WeakMap();
        subtractionResultByInputs.set(comparisonData, resultByReferenceData);
    }

    const cachedResult = resultByReferenceData.get(referenceData);
    if (cachedResult) {
        return cachedResult;
    }

    const result = subtractPerRealizationTables(comparisonData, referenceData);
    resultByReferenceData.set(referenceData, result);
    return result;
}

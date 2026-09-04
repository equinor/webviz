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
): { data: InplaceVolumesTableData_api; unmatchedRows: UnmatchedDeltaRows | null } {
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
    const matchedReferenceRows = new Set<number>();
    for (let row = 0; row < comparisonRowCount; row++) {
        const key = makeRowKey(comparisonSelectorRowValues, selectorColumnNames, row);
        const referenceRow = referenceRowIndexByKey.get(key);
        if (referenceRow !== undefined) {
            matchedRows.push({ comparisonRow: row, referenceRow });
            matchedReferenceRows.add(referenceRow);
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

    const comparisonOnlyRowCount = comparisonRowCount - matchedRows.length;
    const referenceOnlyRowCount = referenceRowCount - matchedReferenceRows.size;

    return {
        data: {
            fluidSelection: comparison.fluidSelection,
            selectorColumns: deltaSelectorColumns,
            resultColumns: deltaResultColumns,
        },
        unmatchedRows:
            comparisonOnlyRowCount > 0 || referenceOnlyRowCount > 0
                ? { fluidSelection: comparison.fluidSelection, comparisonOnlyRowCount, referenceOnlyRowCount }
                : null,
    };
}

export type DroppedFluidSelection = {
    fluidSelection: string;
    /** The side lacking the fluid selection, so the other side's rows cannot be differenced. */
    missingFrom: "comparison" | "reference";
};

export type UnmatchedDeltaRows = {
    fluidSelection: string;
    comparisonOnlyRowCount: number;
    referenceOnlyRowCount: number;
};

export type DeltaTableResult = {
    data: InplaceVolumesTableDataPerFluidSelection_api;
    /** Fluid selections excluded because only one side has them. */
    droppedFluidSelections: DroppedFluidSelection[];
    /** Selector tuples excluded because they occur on only one side of the difference. */
    unmatchedRows: UnmatchedDeltaRows[];
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
    const unmatchedRows: UnmatchedDeltaRows[] = [];
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
        const subtractionResult = subtractFluidSelectionTableData(comparisonFluidTableData, referenceFluidTableData);
        tableDataPerFluidSelection.push(subtractionResult.data);
        if (subtractionResult.unmatchedRows) {
            unmatchedRows.push(subtractionResult.unmatchedRows);
        }
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

    return { data: { tableDataPerFluidSelection }, droppedFluidSelections, unmatchedRows };
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

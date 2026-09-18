import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnData_api,
} from "@api";

import { encodeSelectorColumn, expandSelectorColumn, makeRowKey } from "./selectorColumnUtils";

type MatchedRow = {
    comparisonRow: number;
    referenceRow: number;
};

type RowMatchResult = {
    matchedRows: MatchedRow[];
    selectorColumns: RepeatedTableColumnData_api[];
    comparisonOnlyRowCount: number;
    referenceOnlyRowCount: number;
};

/** Match rows by REAL and the other selector columns shared by both tables. Keep comparison order. */
function matchTableRows(
    comparison: InplaceVolumesTableData_api,
    reference: InplaceVolumesTableData_api,
): RowMatchResult {
    const referenceSelectorNames = new Set(reference.selectorColumns.map((column) => column.columnName));
    const selectorColumnNames = comparison.selectorColumns
        .map((column) => column.columnName)
        .filter((name) => referenceSelectorNames.has(name));

    const comparisonSelectorRowValues = new Map<string, (string | number)[]>();
    for (const column of comparison.selectorColumns) {
        comparisonSelectorRowValues.set(column.columnName, expandSelectorColumn(column));
    }
    const referenceSelectorRowValues = new Map<string, (string | number)[]>();
    for (const column of reference.selectorColumns) {
        referenceSelectorRowValues.set(column.columnName, expandSelectorColumn(column));
    }

    const referenceRowCount = reference.resultColumns[0]?.columnValues.length ?? 0;
    const referenceRowIndexByKey = new Map<string, number>();
    for (let row = 0; row < referenceRowCount; row++) {
        referenceRowIndexByKey.set(makeRowKey(referenceSelectorRowValues, selectorColumnNames, row), row);
    }

    const comparisonRowCount = comparison.resultColumns[0]?.columnValues.length ?? 0;
    const matchedRows: MatchedRow[] = [];
    const matchedReferenceRows = new Set<number>();
    for (let row = 0; row < comparisonRowCount; row++) {
        const key = makeRowKey(comparisonSelectorRowValues, selectorColumnNames, row);
        const referenceRow = referenceRowIndexByKey.get(key);
        if (referenceRow !== undefined) {
            matchedRows.push({ comparisonRow: row, referenceRow });
            matchedReferenceRows.add(referenceRow);
        }
    }

    const selectorColumns = selectorColumnNames.map(function encodeMatchedSelector(name) {
        const comparisonRowValues = comparisonSelectorRowValues.get(name)!;
        const rowValues = matchedRows.map(({ comparisonRow }) => comparisonRowValues[comparisonRow]);
        return encodeSelectorColumn(name, rowValues);
    });

    return {
        matchedRows,
        selectorColumns,
        comparisonOnlyRowCount: comparisonRowCount - matchedRows.length,
        referenceOnlyRowCount: referenceRowCount - matchedReferenceRows.size,
    };
}

/** Subtract shared result columns. Missing values stay missing, rather than becoming zeros. */
function subtractResultColumns(
    comparisonColumns: TableColumnData_api[],
    referenceColumns: TableColumnData_api[],
    matchedRows: MatchedRow[],
): TableColumnData_api[] {
    const referenceColumnByName = new Map<string, TableColumnData_api>();
    for (const column of referenceColumns) {
        referenceColumnByName.set(column.columnName, column);
    }

    const resultColumns: TableColumnData_api[] = [];
    for (const comparisonColumn of comparisonColumns) {
        const referenceColumn = referenceColumnByName.get(comparisonColumn.columnName);
        if (!referenceColumn) {
            continue;
        }
        const columnValues = matchedRows.map(function subtractMatchedRow({ comparisonRow, referenceRow }) {
            const comparisonValue = comparisonColumn.columnValues[comparisonRow];
            const referenceValue = referenceColumn.columnValues[referenceRow];

            return Number.isFinite(comparisonValue) && Number.isFinite(referenceValue)
                ? comparisonValue - referenceValue
                : Number.NaN;
        });
        resultColumns.push({ columnName: comparisonColumn.columnName, columnValues });
    }
    return resultColumns;
}

function subtractFluidSelectionTableData(
    comparison: InplaceVolumesTableData_api,
    reference: InplaceVolumesTableData_api,
): { data: InplaceVolumesTableData_api; unmatchedRows: UnmatchedDeltaRows | null } {
    const { matchedRows, selectorColumns, comparisonOnlyRowCount, referenceOnlyRowCount } = matchTableRows(
        comparison,
        reference,
    );

    return {
        data: {
            fluidSelection: comparison.fluidSelection,
            selectorColumns,
            resultColumns: subtractResultColumns(comparison.resultColumns, reference.resultColumns, matchedRows),
        },
        unmatchedRows:
            comparisonOnlyRowCount > 0 || referenceOnlyRowCount > 0
                ? { fluidSelection: comparison.fluidSelection, comparisonOnlyRowCount, referenceOnlyRowCount }
                : null,
    };
}

export type DroppedFluidSelection = {
    fluidSelection: string;
    /** Which ensemble is missing this fluid selection. */
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
    /** Rows excluded because no matching row exists in the other table. */
    unmatchedRows: UnmatchedDeltaRows[];
};

/**
 * Compute comparison - reference for each realization.
 *
 * Keep only shared fluid selections, matching rows, and shared result columns.
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
 * Reuse the result while both input objects are unchanged. React Query keeps these objects stable
 * between data updates. WeakMaps let the cache be cleared when the inputs are no longer used.
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

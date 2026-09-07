import { describe, expect, test } from "vitest";

import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnData_api,
} from "@api";
import {
    subtractPerRealizationTables,
    subtractPerRealizationTablesMemoized,
} from "@modules/_shared/InplaceVolumes/deltaTableUtils";
import { computeStatisticalTableFromPerRealizationTable } from "@modules/_shared/InplaceVolumes/statisticalTableUtils";

function makeRealColumn(realizations: number[]): RepeatedTableColumnData_api {
    const uniqueValues = Array.from(new Set(realizations));
    const valueToIndex = new Map(uniqueValues.map((value, index) => [value, index]));
    return {
        columnName: "REAL",
        uniqueValues,
        indices: realizations.map((real) => valueToIndex.get(real)!),
    };
}

function makeIndexColumn(columnName: string, values: (string | number)[]): RepeatedTableColumnData_api {
    const uniqueValues = Array.from(new Set(values));
    const valueToIndex = new Map(uniqueValues.map((value, index) => [value, index]));
    return {
        columnName,
        uniqueValues,
        indices: values.map((value) => valueToIndex.get(value)!),
    };
}

function makeResultColumn(columnName: string, columnValues: number[]): TableColumnData_api {
    return { columnName, columnValues };
}

function makeFluidData(
    fluidSelection: string,
    selectorColumns: RepeatedTableColumnData_api[],
    resultColumns: TableColumnData_api[],
): InplaceVolumesTableData_api {
    return { fluidSelection, selectorColumns, resultColumns };
}

function makePerFluidSelection(
    tableDataPerFluidSelection: InplaceVolumesTableData_api[],
): InplaceVolumesTableDataPerFluidSelection_api {
    return { tableDataPerFluidSelection };
}

describe("subtractPerRealizationTables", () => {
    test("computes per-realization difference matched on REAL", () => {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [100, 200, 300])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [90, 210, 280])]),
        ]);

        const result = subtractPerRealizationTables(comparison, reference);
        const delta = result.data;

        expect(delta.tableDataPerFluidSelection).toHaveLength(1);
        const oil = delta.tableDataPerFluidSelection[0];
        expect(oil.fluidSelection).toBe("Oil");
        expect(oil.resultColumns[0].columnName).toBe("STOIIP");
        expect(oil.resultColumns[0].columnValues).toEqual([10, -10, 20]);
    });

    test.each([null, NaN, Infinity, -Infinity])(
        "preserves missing values when either operand is %s",
        function preservesMissingValues(invalidValue) {
            const comparison = makePerFluidSelection([
                makeFluidData(
                    "Oil",
                    [makeRealColumn([0, 1, 2])],
                    [makeResultColumn("PORO", [invalidValue as number, 0.2, invalidValue as number])],
                ),
            ]);
            const reference = makePerFluidSelection([
                makeFluidData(
                    "Oil",
                    [makeRealColumn([0, 1, 2])],
                    [makeResultColumn("PORO", [0.2, invalidValue as number, invalidValue as number])],
                ),
            ]);

            const result = subtractPerRealizationTables(comparison, reference);

            expect(result.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues).toEqual([NaN, NaN, NaN]);
            expect(result.data.tableDataPerFluidSelection[0].selectorColumns).toEqual([makeRealColumn([0, 1, 2])]);
            expect(result.unmatchedRows).toEqual([]);
        },
    );

    test("keeps zero operands as valid values", function keepsZeroOperands() {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [0, 10, 0])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [10, 0, 0])]),
        ]);

        const result = subtractPerRealizationTables(comparison, reference);

        expect(result.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues).toEqual([-10, 10, 0]);
    });

    test("excludes API null pairs from delta statistics", function excludesApiNullPairsFromStatistics() {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("PORO", [NaN, 0.3, NaN])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("PORO", [0.2, 0.2, NaN])]),
        ]);

        const result = subtractPerRealizationTables(
            JSON.parse(JSON.stringify(comparison)),
            JSON.parse(JSON.stringify(reference)),
        );
        const values = result.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues;
        expect(values[0]).toBeNaN();
        expect(values[1]).toBeCloseTo(0.1);
        expect(values[2]).toBeNaN();

        const statistics = computeStatisticalTableFromPerRealizationTable(result.data).tableDataPerFluidSelection[0]
            .resultColumnStatistics[0].statisticValues;
        expect(statistics.mean?.[0]).toBeCloseTo(0.1);
        expect(statistics.min?.[0]).toBeCloseTo(0.1);
        expect(statistics.max?.[0]).toBeCloseTo(0.1);
        expect(statistics.p10?.[0]).toBeCloseTo(0.1);
        expect(statistics.p90?.[0]).toBeCloseTo(0.1);
        expect(statistics.stddev?.[0]).toBeNaN();
    });

    test("performs an inner join on realizations (only common realizations kept)", () => {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [100, 200, 300])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([1, 2, 3])], [makeResultColumn("STOIIP", [210, 280, 400])]),
        ]);

        const result = subtractPerRealizationTables(comparison, reference);
        const delta = result.data;

        const oil = delta.tableDataPerFluidSelection[0];
        // Only realizations 1 and 2 are common.
        expect(oil.selectorColumns[0].columnName).toBe("REAL");
        const realValues = oil.selectorColumns[0].indices.map((i) => oil.selectorColumns[0].uniqueValues[i]);
        expect(realValues).toEqual([1, 2]);
        expect(oil.resultColumns[0].columnValues).toEqual([200 - 210, 300 - 280]);
        expect(result.unmatchedRows).toEqual([
            { fluidSelection: "Oil", comparisonOnlyRowCount: 1, referenceOnlyRowCount: 1 },
        ]);
    });

    test("reports unmatched selector tuples on both sides", () => {
        const comparison = makePerFluidSelection([
            makeFluidData(
                "Oil",
                [makeRealColumn([0, 0, 1]), makeIndexColumn("REGION", ["A", "B", "A"])],
                [makeResultColumn("STOIIP", [10, 20, 30])],
            ),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData(
                "Oil",
                [makeRealColumn([0, 1, 1]), makeIndexColumn("REGION", ["A", "A", "C"])],
                [makeResultColumn("STOIIP", [1, 3, 4])],
            ),
        ]);

        const result = subtractPerRealizationTables(comparison, reference);

        expect(result.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues).toEqual([9, 27]);
        expect(result.unmatchedRows).toEqual([
            { fluidSelection: "Oil", comparisonOnlyRowCount: 1, referenceOnlyRowCount: 1 },
        ]);
    });

    test("matches on multiple selector columns regardless of row order", () => {
        const comparison = makePerFluidSelection([
            makeFluidData(
                "Oil",
                [makeRealColumn([0, 0, 1, 1]), makeIndexColumn("REGION", ["A", "B", "A", "B"])],
                [makeResultColumn("STOIIP", [10, 20, 30, 40])],
            ),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData(
                "Oil",
                // Reference rows in a different order.
                [makeRealColumn([1, 1, 0, 0]), makeIndexColumn("REGION", ["B", "A", "B", "A"])],
                [makeResultColumn("STOIIP", [4, 3, 2, 1])],
            ),
        ]);

        const delta = subtractPerRealizationTables(comparison, reference).data;

        const oil = delta.tableDataPerFluidSelection[0];
        // Rows follow comparison order: (0,A),(0,B),(1,A),(1,B)
        expect(oil.resultColumns[0].columnValues).toEqual([10 - 1, 20 - 2, 30 - 3, 40 - 4]);
    });

    test("only includes fluid selections present in both ensembles", () => {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0])], [makeResultColumn("STOIIP", [100])]),
            makeFluidData("Gas", [makeRealColumn([0])], [makeResultColumn("GIIP", [500])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0])], [makeResultColumn("STOIIP", [90])]),
        ]);

        const delta = subtractPerRealizationTables(comparison, reference);

        expect(delta.data.tableDataPerFluidSelection).toHaveLength(1);
        expect(delta.data.tableDataPerFluidSelection[0].fluidSelection).toBe("Oil");
        expect(delta.droppedFluidSelections).toEqual([{ fluidSelection: "Gas", missingFrom: "reference" }]);
    });

    test("reports fluid selections missing from either side", () => {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0])], [makeResultColumn("STOIIP", [100])]),
            makeFluidData("Gas", [makeRealColumn([0])], [makeResultColumn("GIIP", [500])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0])], [makeResultColumn("STOIIP", [90])]),
            makeFluidData("Water", [makeRealColumn([0])], [makeResultColumn("STOIIP", [10])]),
        ]);

        const delta = subtractPerRealizationTables(comparison, reference);

        expect(delta.data.tableDataPerFluidSelection.map((data) => data.fluidSelection)).toEqual(["Oil"]);
        expect(delta.droppedFluidSelections).toEqual([
            { fluidSelection: "Gas", missingFrom: "reference" },
            { fluidSelection: "Water", missingFrom: "comparison" },
        ]);
    });

    test("only includes result columns present in both ensembles", () => {
        const comparison = makePerFluidSelection([
            makeFluidData(
                "Oil",
                [makeRealColumn([0, 1])],
                [makeResultColumn("STOIIP", [100, 200]), makeResultColumn("BULK", [1, 2])],
            ),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1])], [makeResultColumn("STOIIP", [90, 210])]),
        ]);

        const delta = subtractPerRealizationTables(comparison, reference).data;

        const oil = delta.tableDataPerFluidSelection[0];
        expect(oil.resultColumns.map((column) => column.columnName)).toEqual(["STOIIP"]);
    });
});

describe("subtractPerRealizationTablesMemoized", () => {
    const comparison = makePerFluidSelection([
        makeFluidData("Oil", [makeRealColumn([0, 1])], [makeResultColumn("STOIIP", [100, 200])]),
    ]);
    const reference = makePerFluidSelection([
        makeFluidData("Oil", [makeRealColumn([0, 1])], [makeResultColumn("STOIIP", [90, 210])]),
    ]);

    test("returns the same result reference for the same inputs", () => {
        const first = subtractPerRealizationTablesMemoized(comparison, reference);
        const second = subtractPerRealizationTablesMemoized(comparison, reference);
        expect(second).toBe(first);
    });

    test("recomputes when either input identity changes", () => {
        const first = subtractPerRealizationTablesMemoized(comparison, reference);

        const otherReference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1])], [makeResultColumn("STOIIP", [90, 210])]),
        ]);
        const second = subtractPerRealizationTablesMemoized(comparison, otherReference);

        expect(second).not.toBe(first);
        expect(second.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues).toEqual(
            first.data.tableDataPerFluidSelection[0].resultColumns[0].columnValues,
        );
    });

    test("agrees with the unmemoized function", () => {
        expect(subtractPerRealizationTablesMemoized(comparison, reference)).toEqual(
            subtractPerRealizationTables(comparison, reference),
        );
    });
});

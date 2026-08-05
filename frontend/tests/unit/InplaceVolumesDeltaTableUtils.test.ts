import { describe, expect, test } from "vitest";

import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnData_api,
} from "@api";
import { subtractPerRealizationTables } from "@modules/_shared/InplaceVolumes/deltaTableUtils";

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

        const delta = subtractPerRealizationTables(comparison, reference);

        expect(delta.tableDataPerFluidSelection).toHaveLength(1);
        const oil = delta.tableDataPerFluidSelection[0];
        expect(oil.fluidSelection).toBe("Oil");
        expect(oil.resultColumns[0].columnName).toBe("STOIIP");
        expect(oil.resultColumns[0].columnValues).toEqual([10, -10, 20]);
    });

    test("performs an inner join on realizations (only common realizations kept)", () => {
        const comparison = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([0, 1, 2])], [makeResultColumn("STOIIP", [100, 200, 300])]),
        ]);
        const reference = makePerFluidSelection([
            makeFluidData("Oil", [makeRealColumn([1, 2, 3])], [makeResultColumn("STOIIP", [210, 280, 400])]),
        ]);

        const delta = subtractPerRealizationTables(comparison, reference);

        const oil = delta.tableDataPerFluidSelection[0];
        // Only realizations 1 and 2 are common.
        expect(oil.selectorColumns[0].columnName).toBe("REAL");
        const realValues = oil.selectorColumns[0].indices.map((i) => oil.selectorColumns[0].uniqueValues[i]);
        expect(realValues).toEqual([1, 2]);
        expect(oil.resultColumns[0].columnValues).toEqual([200 - 210, 300 - 280]);
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

        const delta = subtractPerRealizationTables(comparison, reference);

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

        expect(delta.tableDataPerFluidSelection).toHaveLength(1);
        expect(delta.tableDataPerFluidSelection[0].fluidSelection).toBe("Oil");
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

        const delta = subtractPerRealizationTables(comparison, reference);

        const oil = delta.tableDataPerFluidSelection[0];
        expect(oil.resultColumns.map((column) => column.columnName)).toEqual(["STOIIP"]);
    });
});

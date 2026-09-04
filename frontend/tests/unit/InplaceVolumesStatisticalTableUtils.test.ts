import { describe, expect, test } from "vitest";

import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnData_api,
} from "@api";
import { InplaceVolumesStatistic_api } from "@api";
import {
    computeStatisticalTableFromPerRealizationTable,
    computeStatisticalTableFromPerRealizationTableMemoized,
} from "@modules/_shared/InplaceVolumes/statisticalTableUtils";

function makeSelectorColumn(columnName: string, values: (string | number)[]): RepeatedTableColumnData_api {
    const uniqueValues = Array.from(new Set(values));
    const valueToIndex = new Map(uniqueValues.map((value, index) => [value, index]));
    return { columnName, uniqueValues, indices: values.map((value) => valueToIndex.get(value)!) };
}

function makeResultColumn(columnName: string, columnValues: number[]): TableColumnData_api {
    return { columnName, columnValues };
}

function makePerFluidSelection(
    tableDataPerFluidSelection: InplaceVolumesTableData_api[],
): InplaceVolumesTableDataPerFluidSelection_api {
    return { tableDataPerFluidSelection };
}

const ALL_STATISTICS = [
    InplaceVolumesStatistic_api.MEAN,
    InplaceVolumesStatistic_api.STDDEV,
    InplaceVolumesStatistic_api.MIN,
    InplaceVolumesStatistic_api.MAX,
    InplaceVolumesStatistic_api.P10,
    InplaceVolumesStatistic_api.P90,
];

describe("computeStatisticalTableFromPerRealizationTable", () => {
    test("aggregates across realizations and drops the REAL column", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0, 1, 2, 3])],
                resultColumns: [makeResultColumn("STOIIP", [10, 20, 30, 40])],
            },
        ]);

        const statistical = computeStatisticalTableFromPerRealizationTable(perRealization);
        const oil = statistical.tableDataPerFluidSelection[0];

        expect(oil.selectorColumns.map((column) => column.columnName)).not.toContain("REAL");
        expect(oil.resultColumnStatistics).toHaveLength(1);

        const statistics = oil.resultColumnStatistics[0].statisticValues;
        expect(statistics[InplaceVolumesStatistic_api.MEAN]).toEqual([25]);
        expect(statistics[InplaceVolumesStatistic_api.MIN]).toEqual([10]);
        expect(statistics[InplaceVolumesStatistic_api.MAX]).toEqual([40]);
        // Sample standard deviation (ddof=1), matching Polars.
        expect(statistics[InplaceVolumesStatistic_api.STDDEV]![0]).toBeCloseTo(12.909944, 6);
        // Industry convention: P10 is the high value, P90 the low one.
        expect(statistics[InplaceVolumesStatistic_api.P10]![0]).toBeGreaterThan(
            statistics[InplaceVolumesStatistic_api.P90]![0],
        );
    });

    test("groups by the remaining selector columns", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [
                    makeSelectorColumn("REAL", [0, 1, 0, 1]),
                    makeSelectorColumn("ZONE", ["A", "A", "B", "B"]),
                ],
                resultColumns: [makeResultColumn("STOIIP", [10, 20, 100, 300])],
            },
        ]);

        const statistical = computeStatisticalTableFromPerRealizationTable(perRealization);
        const oil = statistical.tableDataPerFluidSelection[0];

        const zoneColumn = oil.selectorColumns.find((column) => column.columnName === "ZONE")!;
        expect(zoneColumn.indices.map((index) => zoneColumn.uniqueValues[index])).toEqual(["A", "B"]);
        expect(oil.resultColumnStatistics[0].statisticValues[InplaceVolumesStatistic_api.MEAN]).toEqual([15, 200]);
    });

    test("emits every statistic, as the backend does", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0, 1])],
                resultColumns: [makeResultColumn("STOIIP", [10, 20])],
            },
        ]);

        const statistical = computeStatisticalTableFromPerRealizationTable(perRealization);

        expect(
            Object.keys(statistical.tableDataPerFluidSelection[0].resultColumnStatistics[0].statisticValues).sort(),
        ).toEqual([...ALL_STATISTICS].sort());
    });

    test("ignores non-finite values, as the backend drops nulls and NaNs", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0, 1, 2])],
                resultColumns: [makeResultColumn("STOIIP", [10, NaN, 20])],
            },
        ]);

        const statistical = computeStatisticalTableFromPerRealizationTable(perRealization);

        expect(
            statistical.tableDataPerFluidSelection[0].resultColumnStatistics[0].statisticValues[
                InplaceVolumesStatistic_api.MEAN
            ],
        ).toEqual([15]);
    });

    test("returns undefined statistics when no finite values remain", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0, 1])],
                resultColumns: [makeResultColumn("STOIIP", [NaN, Infinity])],
            },
        ]);

        const statistics =
            computeStatisticalTableFromPerRealizationTable(perRealization).tableDataPerFluidSelection[0]
                .resultColumnStatistics[0].statisticValues;

        expect(statistics[InplaceVolumesStatistic_api.MEAN]![0]).toBeNaN();
        expect(statistics[InplaceVolumesStatistic_api.STDDEV]![0]).toBeNaN();
    });

    test("returns undefined sample standard deviation for a single finite value", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0])],
                resultColumns: [makeResultColumn("STOIIP", [10])],
            },
        ]);

        const statistics =
            computeStatisticalTableFromPerRealizationTable(perRealization).tableDataPerFluidSelection[0]
                .resultColumnStatistics[0].statisticValues;

        expect(statistics[InplaceVolumesStatistic_api.MEAN]).toEqual([10]);
        expect(statistics[InplaceVolumesStatistic_api.STDDEV]![0]).toBeNaN();
    });

    test("keeps every fluid selection", () => {
        const perRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0])],
                resultColumns: [makeResultColumn("STOIIP", [10])],
            },
            {
                fluidSelection: "gas",
                selectorColumns: [makeSelectorColumn("REAL", [0])],
                resultColumns: [makeResultColumn("GIIP", [50])],
            },
        ]);

        const statistical = computeStatisticalTableFromPerRealizationTable(perRealization);

        expect(statistical.tableDataPerFluidSelection.map((data) => data.fluidSelection)).toEqual(["oil", "gas"]);
    });
});

describe("computeStatisticalTableFromPerRealizationTableMemoized", () => {
    const perRealization = makePerFluidSelection([
        {
            fluidSelection: "oil",
            selectorColumns: [makeSelectorColumn("REAL", [0, 1])],
            resultColumns: [makeResultColumn("STOIIP", [10, 20])],
        },
    ]);

    test("returns the same result reference for the same inputs", () => {
        const first = computeStatisticalTableFromPerRealizationTableMemoized(perRealization);
        const second = computeStatisticalTableFromPerRealizationTableMemoized(perRealization);
        expect(second).toBe(first);
    });

    test("recomputes when the input identity changes", () => {
        const first = computeStatisticalTableFromPerRealizationTableMemoized(perRealization);

        const otherPerRealization = makePerFluidSelection([
            {
                fluidSelection: "oil",
                selectorColumns: [makeSelectorColumn("REAL", [0, 1])],
                resultColumns: [makeResultColumn("STOIIP", [10, 20])],
            },
        ]);
        const second = computeStatisticalTableFromPerRealizationTableMemoized(otherPerRealization);

        expect(second).not.toBe(first);
        expect(second).toEqual(first);
    });
});

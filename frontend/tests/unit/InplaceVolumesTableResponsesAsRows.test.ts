import { describe, expect, test } from "vitest";

import type { InplaceVolumesStatisticalTableData_api } from "@api";
import { InplaceVolumesStatistic_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { sortResultNameStrings } from "@modules/_shared/InplaceVolumes/sortResultNames";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import type { InplaceVolumesStatisticalTableData } from "@modules/_shared/InplaceVolumes/types";
import {
    createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData,
    makeStatisticColumnKey,
    sortTableRowsByCategoryOrder,
} from "@modules/InplaceVolumesTable/view/utils/tableComponentUtils";

const ENSEMBLE_IDENT = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");
const STATISTICS = [InplaceVolumesStatistic_api.MEAN, InplaceVolumesStatistic_api.P10, InplaceVolumesStatistic_api.MAX];
const MEAN_KEY = makeStatisticColumnKey("Mean");
const P10_KEY = makeStatisticColumnKey("P10");
const MAX_KEY = makeStatisticColumnKey("Max");

function makeFluidTable(
    fluidSelection: string,
    zones: string[],
    results: Record<string, number[]>,
    selectorColumnName = "ZONE",
): InplaceVolumesStatisticalTableData_api {
    return {
        fluidSelection,
        selectorColumns: [{ columnName: selectorColumnName, uniqueValues: zones, indices: zones.map((_, i) => i) }],
        resultColumnStatistics: Object.entries(results).map(([columnName, means]) => ({
            columnName,
            statisticValues: {
                [InplaceVolumesStatistic_api.MEAN]: means,
                [InplaceVolumesStatistic_api.P10]: means.map((v) => v + 1),
                [InplaceVolumesStatistic_api.MAX]: means.map((v) => v + 2),
            },
        })),
    };
}

function makeTablesData(perFluid: InplaceVolumesStatisticalTableData_api[]): InplaceVolumesStatisticalTableData[] {
    return [{ ensembleIdent: ENSEMBLE_IDENT, tableName: "geogrid", data: { tableDataPerFluidSelection: perFluid } }];
}

describe("createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData", () => {
    const tablesData = makeTablesData([
        makeFluidTable("oil", ["A", "B"], { STOIIP: [10, 20], BULK: [100, 200] }),
        makeFluidTable("gas", ["A", "B"], { GIIP: [30, 40], BULK: [300, 400] }),
    ]);
    const resultOrder = sortResultNameStrings(["STOIIP", "BULK", "GIIP"]);

    test("headings are identifiers, RESPONSE, then one flat column per statistic", () => {
        const { headings } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(tablesData, STATISTICS);

        expect(Object.keys(headings)).toEqual([
            "ENSEMBLE",
            "TABLE_NAME",
            "FLUID",
            "ZONE",
            "RESPONSE",
            MEAN_KEY,
            P10_KEY,
            MAX_KEY,
        ]);
        expect(headings.RESPONSE).toEqual({ label: "RESPONSE", columnType: ColumnType.INDEX });
        expect(headings[MEAN_KEY]).toEqual({ label: "Mean", columnType: ColumnType.RESULT });
        expect(headings[MEAN_KEY].subHeading).toBeUndefined();
    });

    test("emits one row per base row and response, in result order", () => {
        const { rows } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(tablesData, STATISTICS);

        expect(rows).toHaveLength(4 * resultOrder.length);
        expect(rows.slice(0, resultOrder.length).map((row) => row.RESPONSE)).toEqual(resultOrder);
        expect(new Set(rows.map((row) => row.__id)).size).toBe(rows.length);
    });

    test("values land in the matching row and statistic column", () => {
        const { rows } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(tablesData, STATISTICS);

        const oilZoneBBulk = rows.find((row) => row.FLUID === "oil" && row.ZONE === "B" && row.RESPONSE === "BULK");
        expect(oilZoneBBulk).toMatchObject({ [MEAN_KEY]: 200, [P10_KEY]: 201, [MAX_KEY]: 202 });

        const gasZoneAGiip = rows.find((row) => row.FLUID === "gas" && row.ZONE === "A" && row.RESPONSE === "GIIP");
        expect(gasZoneAGiip).toMatchObject({ [MEAN_KEY]: 30, [P10_KEY]: 31, [MAX_KEY]: 32 });
    });

    test("missing statistics are null, not absent", () => {
        const { rows } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(tablesData, STATISTICS);

        const gasStoiip = rows.filter((row) => row.FLUID === "gas" && row.RESPONSE === "STOIIP");
        expect(gasStoiip).toHaveLength(2);
        for (const row of gasStoiip) {
            expect(row).toHaveProperty([MEAN_KEY], null);
            expect(row).toHaveProperty([P10_KEY], null);
            expect(row).toHaveProperty([MAX_KEY], null);
        }
    });

    test("a selector column named like a statistic keeps its values", () => {
        const collidingTablesData = makeTablesData([makeFluidTable("oil", ["A", "B"], { STOIIP: [1, 2] }, "Mean")]);

        const { headings, rows } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(
            collidingTablesData,
            STATISTICS,
        );

        expect(headings.Mean).toEqual({ label: "Mean", columnType: ColumnType.INDEX });
        expect(headings[MEAN_KEY]).toMatchObject({ label: "Mean", columnType: ColumnType.RESULT });
        expect(rows.map((row) => [row.Mean, row[MEAN_KEY]])).toEqual([
            ["A", 1],
            ["B", 2],
        ]);
    });

    test("throws when an identifier column is already named RESPONSE", () => {
        const collidingTablesData = makeTablesData([makeFluidTable("oil", ["A"], { STOIIP: [1] }, "RESPONSE")]);

        expect(() =>
            createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(collidingTablesData, STATISTICS),
        ).toThrow(/RESPONSE/);
    });

    test("category sort groups rows by identifiers with responses in result order", () => {
        const { headings, rows } = createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData(
            tablesData,
            STATISTICS,
        );

        const sortedRows = sortTableRowsByCategoryOrder(rows, headings, new Map([["ZONE", ["B", "A"]]]));

        const expected = ["oil", "gas"].flatMap((fluid) =>
            ["B", "A"].flatMap((zone) => resultOrder.map((result) => `${fluid}:${zone}:${result}`)),
        );
        expect(sortedRows.map((row) => `${row.FLUID}:${row.ZONE}:${row.RESPONSE}`)).toEqual(expected);
    });
});

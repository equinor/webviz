import { describe, expect, test } from "vitest";

import { InplaceVolumesStatistic_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import type { InplaceVolumesStatisticalTableData } from "@modules/_shared/InplaceVolumes/types";
import {
    collectLeafColumns,
    createStatisticalTableHeadingsAndRowsFromTablesData,
    sortTableRowsByCategoryOrder,
} from "@modules/InplaceVolumesTable/view/utils/tableComponentUtils";
import { sortStatisticsForDisplay } from "@modules/InplaceVolumesTable/view/utils/tableLayoutUtils";

function makeStatisticalTablesData(): InplaceVolumesStatisticalTableData[] {
    return [
        {
            ensembleIdent: new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"),
            tableName: "geogrid",
            data: {
                tableDataPerFluidSelection: [
                    {
                        fluidSelection: "oil",
                        selectorColumns: [{ columnName: "ZONE", uniqueValues: ["A", "B"], indices: [0, 1] }],
                        resultColumnStatistics: [
                            {
                                columnName: "STOIIP",
                                statisticValues: {
                                    [InplaceVolumesStatistic_api.MEAN]: [10, 20],
                                    [InplaceVolumesStatistic_api.P10]: [15, 25],
                                    [InplaceVolumesStatistic_api.MAX]: [30, 40],
                                },
                            },
                        ],
                    },
                ],
            },
        },
    ];
}

describe("createStatisticalTableHeadingsAndRowsFromTablesData", () => {
    test("display-sorted statistic options give leaves in canonical order", () => {
        const statistics = sortStatisticsForDisplay([
            InplaceVolumesStatistic_api.MAX,
            InplaceVolumesStatistic_api.P10,
            InplaceVolumesStatistic_api.MEAN,
        ]);

        const { headings, rows } = createStatisticalTableHeadingsAndRowsFromTablesData(
            makeStatisticalTablesData(),
            statistics,
        );

        const resultLeaves = collectLeafColumns(headings).filter(
            (leaf) => leaf.heading.columnType === ColumnType.RESULT,
        );
        expect(resultLeaves.map((leaf) => leaf.heading.label)).toEqual(["Mean", "P10", "Max"]);
        expect(resultLeaves.map((leaf) => leaf.key)).toEqual(["STOIIP-Mean", "STOIIP-P10", "STOIIP-Max"]);
        expect(rows[1]["STOIIP-Max"]).toBe(40);
    });
});

describe("sortTableRowsByCategoryOrder", () => {
    test("preserves parent grouping while ordering index values like settings", () => {
        const headings = {
            TABLE_NAME: { label: "TABLE_NAME", columnType: ColumnType.TABLE },
            ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
        };
        const rows = [
            { __id: "1", TABLE_NAME: "simgrid", ZONE: "Volon" },
            { __id: "2", TABLE_NAME: "geogrid", ZONE: "Therys" },
            { __id: "3", TABLE_NAME: "simgrid", ZONE: "Valysar" },
            { __id: "4", TABLE_NAME: "geogrid", ZONE: "Valysar" },
        ];

        const sortedRows = sortTableRowsByCategoryOrder(
            rows,
            headings,
            new Map([["ZONE", ["Valysar", "Therys", "Volon"]]]),
        );

        expect(sortedRows.map((row) => `${row.TABLE_NAME}:${row.ZONE}`)).toEqual([
            "simgrid:Valysar",
            "simgrid:Volon",
            "geogrid:Valysar",
            "geogrid:Therys",
        ]);
    });
});

describe("collectLeafColumns", () => {
    test("flat config returns leaves in insertion order with single-element labelPath", () => {
        const columnsConfig = {
            ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
            REAL: { label: "REAL", columnType: ColumnType.REAL },
        };

        const leaves = collectLeafColumns(columnsConfig);

        expect(leaves.map((l) => l.key)).toEqual(["ZONE", "REAL"]);
        expect(leaves.map((l) => l.labelPath)).toEqual([["ZONE"], ["REAL"]]);
    });

    test("nested config produces leaves positioned after preceding flat columns", () => {
        const columnsConfig = {
            ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
            STOIIP: {
                label: "STOIIP",
                subHeading: {
                    "STOIIP-Mean": { label: "Mean", columnType: ColumnType.RESULT },
                    "STOIIP-P10": { label: "P10", columnType: ColumnType.RESULT },
                },
            },
        };

        const leaves = collectLeafColumns(columnsConfig);

        expect(leaves.map((l) => l.key)).toEqual(["ZONE", "STOIIP-Mean", "STOIIP-P10"]);
        expect(leaves.map((l) => l.labelPath)).toEqual([["ZONE"], ["STOIIP", "Mean"], ["STOIIP", "P10"]]);
    });
});

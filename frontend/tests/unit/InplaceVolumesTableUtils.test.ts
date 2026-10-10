import { describe, expect, test } from "vitest";

import { InplaceVolumesStatistic_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import {
    makeStatisticalTableColumnDataFromApiData,
    makeTableFromApiData,
} from "@modules/_shared/InplaceVolumes/tableUtils";
import type {
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableData,
} from "@modules/_shared/InplaceVolumes/types";
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

const ENSEMBLE_IDENT = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");

describe("SENSITIVITY selector column", () => {
    test("makeTableFromApiData types SENSITIVITY and places it after FLUID", () => {
        const tablesData: InplaceVolumesTableData[] = [
            {
                ensembleIdent: ENSEMBLE_IDENT,
                tableName: "geogrid",
                data: {
                    tableDataPerFluidSelection: [
                        // A fluid selection without results is not injected, so it lacks SENSITIVITY.
                        {
                            fluidSelection: "gas",
                            selectorColumns: [
                                { columnName: "REAL", uniqueValues: [0], indices: [0] },
                                { columnName: "ZONE", uniqueValues: ["A"], indices: [0] },
                            ],
                            resultColumns: [],
                        },
                        {
                            fluidSelection: "oil",
                            selectorColumns: [
                                {
                                    columnName: "SENSITIVITY",
                                    uniqueValues: ["rms_seed", "faults:low"],
                                    indices: [0, 1],
                                },
                                { columnName: "REAL", uniqueValues: [0, 3], indices: [0, 1] },
                                { columnName: "ZONE", uniqueValues: ["A"], indices: [0, 0] },
                            ],
                            resultColumns: [{ columnName: "STOIIP", columnValues: [1, 2] }],
                        },
                    ],
                },
            },
        ];

        const columns = makeTableFromApiData(tablesData).getColumns();
        expect(columns.map((column) => column.getName())).toEqual([
            "ENSEMBLE",
            "TABLE_NAME",
            "FLUID",
            "SENSITIVITY",
            "REAL",
            "ZONE",
            "STOIIP",
        ]);
        expect(columns[3].getType()).toBe(ColumnType.SENSITIVITY);
        expect(columns[3].getAllRowValues()).toEqual(["rms_seed", "faults:low"]);
    });

    test("makeStatisticalTableColumnDataFromApiData types SENSITIVITY and places it after FLUID", () => {
        const tablesData: InplaceVolumesStatisticalTableData[] = [
            {
                ensembleIdent: ENSEMBLE_IDENT,
                tableName: "geogrid",
                data: {
                    tableDataPerFluidSelection: [
                        {
                            fluidSelection: "oil",
                            selectorColumns: [
                                { columnName: "ZONE", uniqueValues: ["A"], indices: [0, 0] },
                                {
                                    columnName: "SENSITIVITY",
                                    uniqueValues: ["rms_seed", "faults:low"],
                                    indices: [0, 1],
                                },
                            ],
                            resultColumnStatistics: [
                                {
                                    columnName: "STOIIP",
                                    statisticValues: { [InplaceVolumesStatistic_api.MEAN]: [10, 20] },
                                },
                            ],
                        },
                    ],
                },
            },
        ];

        const { nonStatisticalColumns } = makeStatisticalTableColumnDataFromApiData(tablesData, [
            InplaceVolumesStatistic_api.MEAN,
        ]);
        expect(nonStatisticalColumns.map((column) => column.getName())).toEqual([
            "ENSEMBLE",
            "TABLE_NAME",
            "FLUID",
            "SENSITIVITY",
            "ZONE",
        ]);
        expect(nonStatisticalColumns[3].getType()).toBe(ColumnType.SENSITIVITY);
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

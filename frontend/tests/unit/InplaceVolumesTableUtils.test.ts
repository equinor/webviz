import { describe, expect, test } from "vitest";

import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import {
    collectLeafColumns,
    sortTableRowsByCategoryOrder,
} from "@modules/InplaceVolumesTable/view/utils/tableComponentUtils";

describe("sortTableRowsByCategoryOrder", () => {
    test("preserves parent grouping while ordering index values like settings", () => {
        const headings = {
            TABLE_NAME: { label: "TABLE_NAME", sizeInPercent: 50, columnType: ColumnType.TABLE },
            ZONE: { label: "ZONE", sizeInPercent: 50, columnType: ColumnType.INDEX },
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
            ZONE: { label: "ZONE", sizeInPercent: 50, columnType: ColumnType.INDEX },
            REAL: { label: "REAL", sizeInPercent: 50, columnType: ColumnType.REAL },
        };

        const leaves = collectLeafColumns(columnsConfig);

        expect(leaves.map((l) => l.key)).toEqual(["ZONE", "REAL"]);
        expect(leaves.map((l) => l.labelPath)).toEqual([["ZONE"], ["REAL"]]);
    });

    test("nested config produces leaves positioned after preceding flat columns", () => {
        const columnsConfig = {
            ZONE: { label: "ZONE", sizeInPercent: 50, columnType: ColumnType.INDEX },
            STOIIP: {
                label: "STOIIP",
                sizeInPercent: 50,
                subHeading: {
                    "STOIIP-Mean": { label: "Mean", sizeInPercent: 50, columnType: ColumnType.RESULT },
                    "STOIIP-P10": { label: "P10", sizeInPercent: 50, columnType: ColumnType.RESULT },
                },
            },
        };

        const leaves = collectLeafColumns(columnsConfig);

        expect(leaves.map((l) => l.key)).toEqual(["ZONE", "STOIIP-Mean", "STOIIP-P10"]);
        expect(leaves.map((l) => l.labelPath)).toEqual([["ZONE"], ["STOIIP", "Mean"], ["STOIIP", "P10"]]);
    });
});

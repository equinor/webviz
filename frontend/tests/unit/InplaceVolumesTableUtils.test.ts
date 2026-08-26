import { describe, expect, test } from "vitest";

import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import { sortTableRowsByCategoryOrder } from "@modules/InplaceVolumesTable/view/utils/tableComponentUtils";

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
import { describe, expect, test } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import { Column, ColumnType, Table } from "@modules/_shared/InplaceVolumes/Table";
import { GroupedTableData } from "@modules/InplaceVolumesNew/view/utils/GroupedTableData";
import { makeStatisticsTableColumns } from "@modules/InplaceVolumesNew/view/utils/makeStatisticsTableColumns";
import { buildStatisticsTableData } from "@modules/InplaceVolumesNew/view/utils/TableBuilder";

const colorSet = new ColorSet(new ColorPalette({ id: "test", name: "Test", colors: ["#111111", "#222222"] }));

// Two realizations x two zones, one sensitivity case.
function makeGroupedData(): GroupedTableData {
    const table = new Table([
        new Column("ENSEMBLE", ColumnType.ENSEMBLE, ["ens"], [0, 0, 0, 0]),
        new Column("SENSITIVITY", ColumnType.SENSITIVITY, ["rms_seed"], [0, 0, 0, 0]),
        new Column("REAL", ColumnType.REAL, [0, 1], [0, 0, 1, 1]),
        new Column("ZONE", ColumnType.INDEX, ["Volon", "Valysar"], [0, 1, 0, 1]),
        new Column("STOIIP", ColumnType.RESULT, [10, 2, 30, 4], [0, 1, 2, 3]),
    ]);
    return new GroupedTableData({
        table,
        subplotBy: "ENSEMBLE",
        colorBy: "SENSITIVITY",
        ensembleSet: new EnsembleSet([]),
        colorSet,
    });
}

describe("buildStatisticsTableData", () => {
    test("pools all rows of a group without a bar category", () => {
        const data = buildStatisticsTableData(makeGroupedData(), "STOIIP");

        expect(data.barCategoryLabel).toBeNull();
        expect(data.rows.map((row) => row.mean)).toEqual([formatInplaceVolumesValue(11.5)]);
    });

    test("splits each group per bar category in the preferred order", () => {
        const data = buildStatisticsTableData(makeGroupedData(), "STOIIP", {
            column: "ZONE",
            order: ["Valysar", "Volon"],
        });

        expect(data.barCategoryLabel).toBe("ZONE");
        expect(data.rows.map((row) => [row.barCategoryValue, row.mean])).toEqual([
            ["Valysar", formatInplaceVolumesValue(3)],
            ["Volon", formatInplaceVolumesValue(20)],
        ]);
        expect(new Set(data.rows.map((row) => row.id)).size).toBe(2);
    });
});

describe("makeStatisticsTableColumns", () => {
    test("adds the bar category column only when given, keeping the widths at 100%", () => {
        const withoutCategory = makeStatisticsTableColumns("ENSEMBLE", "SENSITIVITY", null);
        const withCategory = makeStatisticsTableColumns("ENSEMBLE", "SENSITIVITY", "ZONE");

        expect(withoutCategory.map((column) => column.columnId)).not.toContain("barCategoryValue");
        expect(withCategory[2]).toMatchObject({ columnId: "barCategoryValue", label: "ZONE" });
        for (const columns of [withoutCategory, withCategory]) {
            expect(columns.reduce((sum, column) => sum + column.sizeInPercent, 0)).toBe(100);
        }
    });
});

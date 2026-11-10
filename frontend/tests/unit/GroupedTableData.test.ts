import { describe, expect, test } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { Column, ColumnType, Table } from "@modules/_shared/InplaceVolumes/Table";
import {
    GroupedTableData,
    orderColorValues,
    orderEntriesByPreferredValues,
} from "@modules/InplaceVolumesNew/view/utils/GroupedTableData";

describe("orderEntriesByPreferredValues", () => {
    test("orders API groups according to the selected backend order", () => {
        const apiEntries: [string, number][] = [
            ["Volon", 1],
            ["Valysar", 2],
            ["Therys", 3],
        ];

        expect(orderEntriesByPreferredValues(apiEntries, ["Valysar", "Therys", "Volon"])).toEqual([
            ["Valysar", 2],
            ["Therys", 3],
            ["Volon", 1],
        ]);
    });

    test("keeps API order when no preferred order exists", () => {
        const apiEntries: [string, number][] = [
            ["simgrid", 1],
            ["geogrid", 2],
        ];

        expect(orderEntriesByPreferredValues(apiEntries)).toEqual(apiEntries);
    });
});

describe("orderColorValues", () => {
    test("matches the preferred display order", () => {
        expect(orderColorValues(["Volon", "Valysar", "Therys"], ["Valysar", "Therys", "Volon"])).toEqual([
            "Valysar",
            "Therys",
            "Volon",
        ]);
    });

    test("uses stable alphabetical assignment without a preferred order", () => {
        expect(orderColorValues(["Volon", "Valysar", "Therys"])).toEqual(["Therys", "Valysar", "Volon"]);
    });
});

describe("GroupedTableData with sensitivity cases", () => {
    const colorSet = new ColorSet(new ColorPalette({ id: "test", name: "Test", colors: ["#111111", "#222222"] }));

    function makeTable(): Table {
        return new Table([
            new Column("ENSEMBLE", ColumnType.ENSEMBLE, ["ens"], [0, 0, 0, 0]),
            new Column("SENSITIVITY", ColumnType.SENSITIVITY, ["rms_seed", "faults:low"], [0, 0, 0, 1]),
            new Column("REAL", ColumnType.REAL, [0, 1, 2, 3], [0, 1, 2, 3]),
            new Column("STOIIP", ColumnType.RESULT, [5, 7], [0, 0, 0, 1]),
        ]);
    }

    function makeGroupedData(colorOverrides?: ReadonlyMap<string, string>): GroupedTableData {
        return new GroupedTableData({
            table: makeTable(),
            subplotBy: "ENSEMBLE",
            colorBy: "SENSITIVITY",
            ensembleSet: new EnsembleSet([]),
            colorSet,
            colorOverrides,
        });
    }

    test("colour overrides win over the colour set", () => {
        const groupedData = makeGroupedData(new Map([["faults:low", "#abcdef"]]));
        expect(groupedData.getColorMap().get("faults:low")).toBe("#abcdef");
        expect(groupedData.getColorMap().get("rms_seed")).toBe("#111111");
    });

    test("single-value entries survive filterConstantEntries, repeated identical values do not", () => {
        const groupedData = makeGroupedData();
        groupedData.filterConstantEntries("STOIIP");
        expect(groupedData.getAllEntries().map((entry) => entry.colorKey)).toEqual(["faults:low"]);
    });
});

import { describe, expect, test } from "vitest";

import {
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

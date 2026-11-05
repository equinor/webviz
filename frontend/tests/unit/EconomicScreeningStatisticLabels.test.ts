import { describe, expect, test } from "vitest";

import { placeStatisticLabels } from "@modules/EconomicScreening/utils/statisticLabels";

describe("placeStatisticLabels", () => {
    test("keeps well-separated labels on the first row", () => {
        const placed = placeStatisticLabels(
            [
                { x: 5.38, text: "P90 5.38" },
                { x: 6.24, text: "P50 6.24" },
                { x: 7.18, text: "P10 7.18" },
            ],
            500,
        );
        expect(placed.map((label) => label.row)).toEqual([0, 0, 0]);
    });

    test("moves overlapping labels up, reusing a lower row when it is free", () => {
        const placed = placeStatisticLabels(
            [
                { x: 6.24, text: "P50 6.24" },
                { x: 6.22, text: "Mean 6.22" },
                { x: 5.38, text: "P90 5.38" },
                { x: 6.25, text: "Oil price 6.25" },
            ],
            100,
        );
        expect(placed.map((label) => [label.text, label.row])).toEqual([
            ["P90 5.38", 0],
            ["Mean 6.22", 0],
            ["P50 6.24", 1],
            ["Oil price 6.25", 2],
        ]);
    });

    test("stacks every label when all values are equal", () => {
        const placed = placeStatisticLabels(
            [
                { x: 1, text: "P90 1.00" },
                { x: 1, text: "P50 1.00" },
            ],
            Number.POSITIVE_INFINITY,
        );
        expect(placed.map((label) => label.row)).toEqual([0, 1]);
    });
});

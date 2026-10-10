import { describe, expect, test } from "vitest";

import {
    computeSubplotXAxisSpacing,
    estimateXTickLabelExtent,
    type SubplotXAxisSpacingOptions,
} from "@modules/InplaceVolumesNew/view/utils/subplotSpacing";

function makeOptions(overrides: Partial<SubplotXAxisSpacingOptions> = {}): SubplotXAxisSpacingOptions {
    return {
        numRows: 2,
        availableHeight: 600,
        showTickLabels: true,
        categoryLabels: ["Volon", "Valysar"],
        tickAngle: 35,
        tickFontSize: 12,
        axisTitle: { standoff: 20, fontSize: 14 },
        ...overrides,
    };
}

describe("estimateXTickLabelExtent", () => {
    test("rotated category labels grow with the longest label", () => {
        const short = estimateXTickLabelExtent(["A", "Volon"], 35, 12);
        const long = estimateXTickLabelExtent(["A", "CentralRamp"], 35, 12);

        expect(long).toBeGreaterThan(short);
        expect(short).toBeGreaterThan(12);
    });

    test("numeric and unrotated axes take one line", () => {
        expect(estimateXTickLabelExtent(null, 35, 12)).toBe(16);
        expect(estimateXTickLabelExtent(["CentralRamp"], 0, 12)).toBe(16);
    });
});

describe("computeSubplotXAxisSpacing", () => {
    test("hidden tick labels take no space", () => {
        const spacing = computeSubplotXAxisSpacing(makeOptions({ showTickLabels: false }));

        expect(spacing.showTickLabels).toBe(false);
        expect(spacing.tickLabelExtent).toBe(0);
    });

    test("longer labels give a larger gap", () => {
        const short = computeSubplotXAxisSpacing(makeOptions({ categoryLabels: ["Volon"] }));
        const long = computeSubplotXAxisSpacing(makeOptions({ categoryLabels: ["CentralRamp"] }));

        expect(long.showTickLabels).toBe(true);
        expect(long.verticalGap).toBeGreaterThan(short.verticalGap);
        expect(long.verticalSpacing).toBeGreaterThan(short.verticalSpacing);
    });

    test("hides the labels when they would take too much of a row", () => {
        const fewRows = computeSubplotXAxisSpacing(makeOptions({ categoryLabels: ["CentralRamp"] }));
        const manyRows = computeSubplotXAxisSpacing(makeOptions({ categoryLabels: ["CentralRamp"], numRows: 5 }));

        expect(fewRows.showTickLabels).toBe(true);
        expect(manyRows.showTickLabels).toBe(false);
        expect(manyRows.tickLabelExtent).toBe(0);
        expect(manyRows.verticalGap).toBeLessThan(fewRows.verticalGap);
    });
});

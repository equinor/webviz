import { describe, expect, it } from "vitest";

import type { VolumeChangeDecomposition } from "@modules/InplaceVolumesComparison/view/utils/computeVolumeChangeDecomposition";
import { calcNumRowsAndCols, makeYAxisRange } from "@modules/InplaceVolumesComparison/view/utils/waterfallPlotLayout";

function makeDecomposition(cumulatives: number[]): VolumeChangeDecomposition {
    return {
        target: "STOIIP",
        referenceVolume: cumulatives[0],
        comparisonVolume: cumulatives[cumulatives.length - 1],
        bars: cumulatives.map((cumulative, index) => ({
            label: `bar-${index}`,
            measure: index === 0 || index === cumulatives.length - 1 ? "absolute" : "relative",
            value: cumulative,
            cumulative,
        })),
    };
}

describe("calcNumRowsAndCols", () => {
    it("uses a single cell for zero or one subplot", () => {
        expect(calcNumRowsAndCols(0)).toEqual({ numRows: 1, numCols: 1 });
        expect(calcNumRowsAndCols(1)).toEqual({ numRows: 1, numCols: 1 });
    });

    it("grows into a roughly square grid", () => {
        expect(calcNumRowsAndCols(4)).toEqual({ numRows: 2, numCols: 2 });
        expect(calcNumRowsAndCols(5)).toEqual({ numRows: 3, numCols: 2 });
    });
});

describe("makeYAxisRange", () => {
    it("pads around the cumulative min/max when they differ", () => {
        const [low, high] = makeYAxisRange(makeDecomposition([100, 150, 120]));
        expect(low).toBeLessThan(100);
        expect(high).toBeGreaterThan(150);
    });

    it("falls back to a padding based on magnitude when all cumulatives are equal and nonzero", () => {
        const [low, high] = makeYAxisRange(makeDecomposition([100, 100]));
        expect(low).toBeLessThan(100);
        expect(high).toBeGreaterThan(100);
    });

    it("falls back to a fixed padding when all cumulatives are zero", () => {
        const [low, high] = makeYAxisRange(makeDecomposition([0, 0]));
        expect(low).toBe(-1);
        expect(high).toBe(1);
    });
});

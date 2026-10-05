import { describe, expect, it } from "vitest";

import type { VolumeChangeDecomposition } from "@modules/InplaceVolumesComparison/view/utils/computeVolumeChangeDecomposition";
import { makeYAxisRange } from "@modules/InplaceVolumesComparison/view/utils/waterfallPlotLayout";

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

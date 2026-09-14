import { describe, expect, it } from "vitest";

import type { WaterfallBar } from "@modules/InplaceVolumesComparison/view/utils/computeVolumeChangeDecomposition";
import { computeBarChangePercent } from "@modules/InplaceVolumesComparison/view/utils/waterfallBarPresentation";

describe("computeBarChangePercent", () => {
    it("returns null for the absolute endpoint bars", () => {
        const bars: WaterfallBar[] = [
            { label: "Reference", measure: "absolute", value: 100, cumulative: 100 },
            { label: "Comparison", measure: "absolute", value: 100, cumulative: 100 },
        ];

        expect(computeBarChangePercent(bars, 0)).toBeNull();
        expect(computeBarChangePercent(bars, 1)).toBeNull();
    });

    it("computes the percent change relative to the previous cumulative", () => {
        const bars: WaterfallBar[] = [
            { label: "Reference", measure: "absolute", value: 100, cumulative: 100 },
            { label: "BULK", measure: "relative", value: 10, cumulative: 110 },
        ];

        expect(computeBarChangePercent(bars, 1)).toBeCloseTo(10);
    });

    it("returns null instead of 0 when the previous cumulative is zero", () => {
        const bars: WaterfallBar[] = [
            { label: "Reference", measure: "absolute", value: 0, cumulative: 0 },
            { label: "BULK", measure: "relative", value: 5, cumulative: 5 },
        ];

        expect(computeBarChangePercent(bars, 1)).toBeNull();
    });
});

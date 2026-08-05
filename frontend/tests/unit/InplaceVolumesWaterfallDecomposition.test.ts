import { describe, expect, test } from "vitest";

import {
    computeVolumeChangeDecomposition,
    getWaterfallFactorSpec,
} from "@modules/InplaceVolumesChangeDecomposition/view/utils/computeVolumeChangeDecomposition";

describe("getWaterfallFactorSpec", () => {
    test("returns collapsed PORO factors for STOIIP", () => {
        const spec = getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "PORO", "SW", "BO"]);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "PORO", "SO", "BO"]);
        expect(spec!.requiredResultNames.sort()).toEqual(["BO", "BULK", "PORO", "STOIIP", "SW"].sort());
    });

    test("splits into NTG and PORO_NET when both are available", () => {
        const spec = getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "NTG", "PORO_NET", "SW", "BO"]);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "NTG", "PORO_NET", "SO", "BO"]);
    });

    test("uses BG and SG for GIIP", () => {
        const spec = getWaterfallFactorSpec("GIIP", ["GIIP", "BULK", "PORO", "SW", "BG"]);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "PORO", "SG", "BG"]);
    });

    test("returns null for a non-decomposable result", () => {
        expect(getWaterfallFactorSpec("BULK", ["BULK", "PORO", "SW", "BO"])).toBeNull();
    });

    test("returns null when a required factor is missing", () => {
        // Missing BO
        expect(getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "PORO", "SW"])).toBeNull();
    });
});

describe("computeVolumeChangeDecomposition", () => {
    test("decomposes and reconciles exactly when means satisfy the product identity", () => {
        const spec = getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "PORO", "SW", "BO"])!;

        // STOIIP = BULK * PORO * SO / BO, SO = 1 - SW
        // Reference: 100 * 0.2 * 0.7 / 1.25 = 11.2
        const referenceMeans = new Map<string, number>([
            ["STOIIP", 11.2],
            ["BULK", 100],
            ["PORO", 0.2],
            ["SW", 0.3],
            ["BO", 1.25],
        ]);
        // Comparison: 110 * 0.22 * 0.75 / 1.2 = 15.125
        const comparisonMeans = new Map<string, number>([
            ["STOIIP", 15.125],
            ["BULK", 110],
            ["PORO", 0.22],
            ["SW", 0.25],
            ["BO", 1.2],
        ]);

        const decomposition = computeVolumeChangeDecomposition(spec, referenceMeans, comparisonMeans)!;
        expect(decomposition).not.toBeNull();

        // [ref, BULK, PORO, SO, BO, comp]
        expect(decomposition.bars).toHaveLength(6);
        expect(decomposition.bars[0].measure).toBe("absolute");
        expect(decomposition.bars[0].value).toBeCloseTo(11.2, 6);
        expect(decomposition.bars[5].measure).toBe("absolute");
        expect(decomposition.bars[5].value).toBeCloseTo(15.125, 6);

        // BULK impact = 11.2 * (110/100 - 1) = 1.12
        expect(decomposition.bars[1].value).toBeCloseTo(1.12, 6);

        // Sum of relative impacts equals the total change (exact reconciliation here).
        const relativeSum = decomposition.bars
            .filter((bar) => bar.measure === "relative")
            .reduce((sum, bar) => sum + bar.value, 0);
        expect(relativeSum).toBeCloseTo(15.125 - 11.2, 6);

        // The cumulative after the last factor equals the comparison volume.
        expect(decomposition.bars[4].cumulative).toBeCloseTo(15.125, 6);
    });

    test("returns null when a reference factor mean is zero", () => {
        const spec = getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "PORO", "SW", "BO"])!;
        const referenceMeans = new Map<string, number>([
            ["STOIIP", 10],
            ["BULK", 0],
            ["PORO", 0.2],
            ["SW", 0.3],
            ["BO", 1.25],
        ]);
        const comparisonMeans = new Map<string, number>([
            ["STOIIP", 12],
            ["BULK", 110],
            ["PORO", 0.22],
            ["SW", 0.25],
            ["BO", 1.2],
        ]);
        expect(computeVolumeChangeDecomposition(spec, referenceMeans, comparisonMeans)).toBeNull();
    });
});

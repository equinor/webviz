import { describe, expect, test } from "vitest";

import {
    computeVolumeChangeDecomposition,
    getWaterfallFactorSpec,
} from "@modules/InplaceVolumesChangeDecomposition/view/utils/computeVolumeChangeDecomposition";

const COLLAPSED_RESULT_NAMES = ["STOIIP", "BULK", "PORV", "HCPV"];

describe("getWaterfallFactorSpec", () => {
    test("returns collapsed PORO factors for STOIIP", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "PORO", "SO", "BO"]);
        expect(spec!.requiredResultNames.sort()).toEqual(["BULK", "HCPV", "PORV", "STOIIP"]);
    });

    test("builds each factor as a ratio of mean volumes", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        expect(spec.factors).toEqual([
            { label: "BULK", numeratorResultName: "BULK", denominatorResultName: null, dividesVolume: false },
            { label: "PORO", numeratorResultName: "PORV", denominatorResultName: "BULK", dividesVolume: false },
            { label: "SO", numeratorResultName: "HCPV", denominatorResultName: "PORV", dividesVolume: false },
            { label: "BO", numeratorResultName: "HCPV", denominatorResultName: "STOIIP", dividesVolume: true },
        ]);
    });

    test("splits into NTG and PORO_NET when the split properties and NET are available", () => {
        const spec = getWaterfallFactorSpec("STOIIP", [...COLLAPSED_RESULT_NAMES, "NET", "NTG", "PORO_NET"]);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "NTG", "PORO_NET", "SO", "BO"]);
        expect(spec!.requiredResultNames).toContain("NET");
    });

    test("uses BG and SG for GIIP", () => {
        const spec = getWaterfallFactorSpec("GIIP", ["GIIP", "BULK", "PORV", "HCPV"]);
        expect(spec).not.toBeNull();
        expect(spec!.factors.map((factor) => factor.label)).toEqual(["BULK", "PORO", "SG", "BG"]);
        expect(spec!.factors.at(-1)!.denominatorResultName).toBe("GIIP");
    });

    test("returns null for a non-decomposable result", () => {
        expect(getWaterfallFactorSpec("BULK", COLLAPSED_RESULT_NAMES)).toBeNull();
    });

    test("returns null when a required volume column is missing", () => {
        expect(getWaterfallFactorSpec("STOIIP", ["STOIIP", "BULK", "PORV"])).toBeNull();
    });
});

describe("computeVolumeChangeDecomposition", () => {
    // STOIIP = BULK * (PORV/BULK) * (HCPV/PORV) / (HCPV/STOIIP)
    // Reference: 100 * 0.2 * 0.7 / 1.25 = 11.2
    const referenceMeans = new Map<string, number>([
        ["BULK", 100],
        ["PORV", 20],
        ["HCPV", 14],
        ["STOIIP", 11.2],
    ]);
    // Comparison: 110 * 0.22 * 0.75 / 1.2 = 15.125
    const comparisonMeans = new Map<string, number>([
        ["BULK", 110],
        ["PORV", 24.2],
        ["HCPV", 18.15],
        ["STOIIP", 15.125],
    ]);

    test("decomposes into one bar per factor plus both endpoints", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        const decomposition = computeVolumeChangeDecomposition(spec, referenceMeans, comparisonMeans)!;
        expect(decomposition).not.toBeNull();

        // [ref, BULK, PORO, SO, BO, comp] - no residual bar
        expect(decomposition.bars.map((bar) => bar.label)).toEqual([
            "Reference",
            "BULK",
            "PORO",
            "SO",
            "BO",
            "Comparison",
        ]);
        expect(decomposition.bars[0].measure).toBe("absolute");
        expect(decomposition.bars[0].value).toBeCloseTo(11.2, 6);
        expect(decomposition.bars[5].measure).toBe("absolute");
        expect(decomposition.bars[5].value).toBeCloseTo(15.125, 6);

        // BULK impact = 11.2 * (110/100 - 1) = 1.12
        expect(decomposition.bars[1].value).toBeCloseTo(1.12, 6);
    });

    test("reconciles exactly to the comparison volume", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        const decomposition = computeVolumeChangeDecomposition(spec, referenceMeans, comparisonMeans)!;

        // The cumulative after the last factor already equals the comparison volume.
        expect(decomposition.bars[4].cumulative).toBeCloseTo(15.125, 6);

        const relativeSum = decomposition.bars
            .filter((bar) => bar.measure === "relative")
            .reduce((sum, bar) => sum + bar.value, 0);
        expect(relativeSum).toBeCloseTo(15.125 - 11.2, 6);
    });

    test("reconciles exactly for arbitrary means, since the factors telescope", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        // Deliberately unrelated numbers: ratio-of-means factors telescope to STOIIP_comp/STOIIP_ref
        // regardless of whether the means satisfy any product identity.
        const messyReference = new Map<string, number>([
            ["BULK", 1234],
            ["PORV", 210.5],
            ["HCPV", 143.2],
            ["STOIIP", 118.9],
        ]);
        const messyComparison = new Map<string, number>([
            ["BULK", 1301],
            ["PORV", 228.9],
            ["HCPV", 160.4],
            ["STOIIP", 130.1],
        ]);

        const decomposition = computeVolumeChangeDecomposition(spec, messyReference, messyComparison)!;

        expect(decomposition.bars.at(-2)!.cumulative).toBeCloseTo(130.1, 9);

        const relativeSum = decomposition.bars
            .filter((bar) => bar.measure === "relative")
            .reduce((sum, bar) => sum + bar.value, 0);
        expect(relativeSum).toBeCloseTo(130.1 - 118.9, 9);
    });

    test("splits the porosity impact across NTG and PORO_NET without changing the total", () => {
        const collapsedSpec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        const splitSpec = getWaterfallFactorSpec("STOIIP", [...COLLAPSED_RESULT_NAMES, "NET", "NTG", "PORO_NET"])!;

        const referenceWithNet = new Map(referenceMeans).set("NET", 80);
        const comparisonWithNet = new Map(comparisonMeans).set("NET", 99);

        const collapsed = computeVolumeChangeDecomposition(collapsedSpec, referenceWithNet, comparisonWithNet)!;
        const split = computeVolumeChangeDecomposition(splitSpec, referenceWithNet, comparisonWithNet)!;

        expect(split.bars.map((bar) => bar.label)).toContain("NTG");
        expect(split.comparisonVolume).toBeCloseTo(collapsed.comparisonVolume, 9);
        expect(split.bars.at(-2)!.cumulative).toBeCloseTo(collapsed.bars.at(-2)!.cumulative, 9);
    });

    test("returns null when a reference volume is zero", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        const zeroBulkReference = new Map(referenceMeans).set("BULK", 0);
        expect(computeVolumeChangeDecomposition(spec, zeroBulkReference, comparisonMeans)).toBeNull();
    });

    test("returns null when a required mean is missing", () => {
        const spec = getWaterfallFactorSpec("STOIIP", COLLAPSED_RESULT_NAMES)!;
        const withoutHcpv = new Map(referenceMeans);
        withoutHcpv.delete("HCPV");
        expect(computeVolumeChangeDecomposition(spec, withoutHcpv, comparisonMeans)).toBeNull();
    });
});

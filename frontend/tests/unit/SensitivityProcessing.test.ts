import { describe, expect, test } from "vitest";

import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import type { EnsemblePerRealizationResponse } from "@modules/_shared/SensitivityProcessing";

describe("computeSensitivitiesForResponse", () => {
    test("adds sensitivity average for Monte Carlo sensitivities", () => {
        const sensitivities = new EnsembleSensitivities([
            {
                name: "rms_seed",
                type: SensitivityType.MONTECARLO,
                cases: [{ name: "p10_p90", realizations: [1, 2, 3, 4, 5] }],
            },
        ]);
        const response: EnsemblePerRealizationResponse = {
            realizations: [1, 2, 3, 4, 5],
            values: [10, 20, 30, 40, 100],
        };

        const dataset = computeSensitivitiesForResponse(
            sensitivities,
            response,
            "rms_seed",
            SensitivitySortBy.IMPACT,
            false,
        );

        expect(dataset.sensitivityResponses[0].sensitivityAverage).toBe(40);
        expect(dataset.sensitivityResponses[0].lowCaseAverage).toBe(14);
        expect(dataset.sensitivityResponses[0].highCaseAverage).toBe(76);
    });

    test("does not add sensitivity average for scenario sensitivities", () => {
        const sensitivities = new EnsembleSensitivities([
            {
                name: "porosity",
                type: SensitivityType.SCENARIO,
                cases: [
                    { name: "low", realizations: [1, 2] },
                    { name: "high", realizations: [3, 4] },
                ],
            },
        ]);
        const response: EnsemblePerRealizationResponse = {
            realizations: [1, 2, 3, 4],
            values: [10, 20, 30, 40],
        };

        const dataset = computeSensitivitiesForResponse(
            sensitivities,
            response,
            "porosity",
            SensitivitySortBy.IMPACT,
            false,
        );

        expect(dataset.sensitivityResponses[0].sensitivityAverage).toBeUndefined();
    });
});

describe("computeSensitivitiesForResponse hiding sensitivities without impact", () => {
    const sensitivities = new EnsembleSensitivities([
        {
            name: "rms_seed",
            type: SensitivityType.MONTECARLO,
            cases: [{ name: "p10_p90", realizations: [1, 2, 3, 4] }],
        },
        { name: "kvkh", type: SensitivityType.SCENARIO, cases: [{ name: "low", realizations: [5, 6, 7, 8] }] },
        {
            name: "multregt_mc",
            type: SensitivityType.MONTECARLO,
            cases: [{ name: "p10_p90", realizations: [9, 10, 11, 12] }],
        },
        { name: "hum", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [13, 14, 15, 16] }] },
        {
            name: "fwl",
            type: SensitivityType.SCENARIO,
            cases: [
                { name: "shallow", realizations: [17, 18] },
                { name: "deep", realizations: [19, 20] },
            ],
        },
    ]);
    const response: EnsemblePerRealizationResponse = {
        realizations: Array.from({ length: 20 }, (_, i) => i + 1),
        values: [
            // rms_seed, mean 25
            10,
            20,
            30,
            40,
            // kvkh: same as rms_seed up to summation noise
            10,
            20,
            30,
            40 + 1e-9,
            // multregt_mc: identical to rms_seed
            10,
            20,
            30,
            40,
            // hum: same mean as rms_seed, wider spread
            0,
            25,
            25,
            50,
            // fwl
            15,
            15,
            35,
            35,
        ],
    };

    function computeNames(hideNoImpact: boolean): string[] {
        return computeSensitivitiesForResponse(
            sensitivities,
            response,
            "rms_seed",
            SensitivitySortBy.ALPHABETICAL,
            hideNoImpact,
        )
            .sensitivityResponses.map((r) => r.sensitivityName)
            .sort();
    }

    test("keeps every sensitivity when not hiding", () => {
        expect(computeNames(false)).toEqual(["fwl", "hum", "kvkh", "multregt_mc", "rms_seed"]);
    });

    test("hides near-zero scenarios and Monte Carlo sensitivities matching the reference, but keeps the reference", () => {
        expect(computeNames(true)).toEqual(["fwl", "hum", "rms_seed"]);
    });
});

describe("computeSensitivitiesForResponse with a partial response", () => {
    const sensitivities = new EnsembleSensitivities([
        { name: "rms_seed", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [1, 2] }] },
        { name: "hum", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [3, 4] }] },
        { name: "minpv", type: SensitivityType.SCENARIO, cases: [{ name: "low", realizations: [5, 6] }] },
        {
            name: "fwl",
            type: SensitivityType.SCENARIO,
            cases: [
                { name: "shallow", realizations: [7, 8] },
                { name: "deep", realizations: [9, 10] },
            ],
        },
    ]);

    function compute(realizations: number[], values: number[]) {
        return computeSensitivitiesForResponse(
            sensitivities,
            { realizations, values },
            "rms_seed",
            SensitivitySortBy.ALPHABETICAL,
            false,
        );
    }

    test("leaves out sensitivities without values instead of treating them as zero", () => {
        // Only rms_seed and fwl:deep, as when the sender filters on those cases.
        const dataset = compute([1, 2, 9, 10], [10, 20, 30, 40]);

        expect(dataset.hasReferenceData).toBe(true);
        expect(dataset.sensitivitiesWithoutData.sort()).toEqual(["hum", "minpv"]);
        expect(dataset.sensitivityResponses.map((r) => r.sensitivityName).sort()).toEqual(["fwl", "rms_seed"]);
    });

    test("processes a scenario with one case missing as a single-case scenario", () => {
        const dataset = compute([1, 2, 9, 10], [10, 20, 30, 40]);
        const fwl = dataset.sensitivityResponses.find((r) => r.sensitivityName === "fwl")!;

        // deep (35) is above the reference (15), so it is the high side.
        expect(fwl.highCaseName).toBe("deep");
        expect(fwl.highCaseReferenceDifference).toBe(20);
        expect(fwl.lowCaseReferenceDifference).toBe(0);
    });

    test("puts a single scenario case below the reference on the low side", () => {
        const dataset = compute([1, 2, 7, 8], [30, 40, 10, 20]);
        const fwl = dataset.sensitivityResponses.find((r) => r.sensitivityName === "fwl")!;

        expect(fwl.lowCaseName).toBe("shallow");
        expect(fwl.lowCaseReferenceDifference).toBe(-20);
        expect(fwl.highCaseReferenceDifference).toBe(0);
    });

    test("computes nothing when the reference has no values", () => {
        const dataset = compute([7, 8, 9, 10], [10, 20, 30, 40]);

        expect(dataset.hasReferenceData).toBe(false);
        expect(dataset.sensitivityResponses).toEqual([]);
        expect(dataset.sensitivitiesWithoutData).toEqual(["rms_seed"]);
    });
});

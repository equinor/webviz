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

    test("adds sensitivity average across all cases for scenario sensitivities", () => {
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

        expect(dataset.sensitivityResponses[0].sensitivityAverage).toBe(25);
    });
});

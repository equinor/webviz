import { describe, expect, test } from "vitest";

import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import { SensitivityScaling } from "@modules/SensitivityPlot/typesAndEnums";
import { SensitivityDataScaler } from "@modules/SensitivityPlot/view/utils/sensitivityDataScaler";

const sensitivities = new EnsembleSensitivities([
    { name: "rms_seed", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [1, 2, 3, 4] }] },
    {
        name: "hum",
        type: SensitivityType.MONTECARLO,
        cases: [{ name: "p10_p90", realizations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }],
    },
]);

// hum has one far outlier (1000) that lies well beyond its P10.
const dataset = computeSensitivitiesForResponse(
    sensitivities,
    {
        realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        values: [100, 100, 100, 100, 90, 95, 100, 100, 100, 105, 105, 110, 110, 1000],
    },
    "rms_seed",
    SensitivitySortBy.IMPACT,
    false,
);
const scaler = new SensitivityDataScaler(SensitivityScaling.RELATIVE, dataset.referenceAverage);

describe("SensitivityDataScaler.calculateXAxisRange", () => {
    test("hidden realization points do not widen the axis", () => {
        const [, maxWithoutPoints] = scaler.calculateXAxisRange(dataset.sensitivityResponses, {
            realizationPoints: false,
            sensitivityMeanPoints: false,
        });
        const [, maxWithPoints] = scaler.calculateXAxisRange(dataset.sensitivityResponses, {
            realizationPoints: true,
            sensitivityMeanPoints: false,
        });

        expect(maxWithPoints).toBeGreaterThan(900);
        expect(maxWithoutPoints).toBeLessThan(maxWithPoints / 2);
    });
});

import { describe, expect, test } from "vitest";

import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import type { SensitivityResponse } from "@modules/_shared/SensitivityProcessing";
import { makeTornadoBarHoverTemplate } from "@modules/SensitivityPlot/view/utils/tornadoBarHover";

const sensitivities = new EnsembleSensitivities([
    { name: "rms_seed", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [1, 2, 3, 4] }] },
    {
        name: "fwl",
        type: SensitivityType.SCENARIO,
        cases: [
            { name: "shallow", realizations: [5, 6] },
            { name: "deep", realizations: [7, 8] },
        ],
    },
    { name: "kvkh", type: SensitivityType.SCENARIO, cases: [{ name: "high", realizations: [9, 10] }] },
    {
        name: "faultseal",
        type: SensitivityType.SCENARIO,
        cases: [
            { name: "low", realizations: [11, 12] },
            { name: "high", realizations: [13, 14] },
        ],
    },
]);

// Reference (rms_seed) mean 100; fwl 90/110; kvkh 120; faultseal 105/115, both above the reference.
const dataset = computeSensitivitiesForResponse(
    sensitivities,
    {
        realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        values: [90, 100, 100, 110, 90, 90, 110, 110, 120, 120, 115, 115, 105, 105],
    },
    "rms_seed",
    SensitivitySortBy.ALPHABETICAL,
    false,
);

function response(name: string): SensitivityResponse {
    return dataset.sensitivityResponses.find((r) => r.sensitivityName === name)!;
}

describe("makeTornadoBarHoverTemplate", () => {
    test("a scenario bar names its case, average, difference and realization count", () => {
        const template = makeTornadoBarHoverTemplate(response("fwl"), "high", dataset.referenceAverage);

        expect(template).toBe(
            "<b>fwl</b> · deep<br>Average: 110<br>vs reference: +10 (+10.0%)<br>Realizations: 2<extra></extra>",
        );
    });

    test("a distribution bar names P10/P90 and counts all its realizations", () => {
        const template = makeTornadoBarHoverTemplate(response("rms_seed"), "low", dataset.referenceAverage);

        expect(template).toContain("<b>rms_seed</b> · P90");
        expect(template).toContain("Realizations: 4");
    });

    test("the empty side of a single-case scenario says so", () => {
        expect(makeTornadoBarHoverTemplate(response("kvkh"), "low", dataset.referenceAverage)).toBe(
            "<b>kvkh</b><br>No low case<extra></extra>",
        );
    });

    test("with both cases on one side, either bar describes both cases", () => {
        const expected =
            "<b>faultseal</b><br>Both cases above the reference; the bar spans between them<br>" +
            "high: 105, +5 (+5.0%) vs reference, 2 reals<br>" +
            "low: 115, +15 (+15.0%) vs reference, 2 reals<extra></extra>";

        expect(makeTornadoBarHoverTemplate(response("faultseal"), "high", dataset.referenceAverage)).toBe(expected);
        expect(makeTornadoBarHoverTemplate(response("faultseal"), "low", dataset.referenceAverage)).toBe(expected);
    });
});

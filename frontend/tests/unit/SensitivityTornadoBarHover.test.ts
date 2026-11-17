import { describe, expect, test } from "vitest";

import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import type { SensitivityResponse } from "@modules/_shared/SensitivityProcessing";
import { makeTornadoBarHoverTemplate } from "@modules/SensitivityPlot/view/utils/tornadoBarHover";

import { hoverTemplateToLines } from "../utils/plotlyHoverText";

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

function hoverText(name: string, side: "low" | "high"): string {
    return hoverTemplateToLines(makeTornadoBarHoverTemplate(response(name), side, dataset.referenceAverage)).join("\n");
}

describe("makeTornadoBarHoverTemplate", () => {
    test("a scenario bar names its case, average, difference and realization count", () => {
        const text = hoverText("fwl", "high");

        for (const part of ["fwl", "deep", "110", "+10 (+10.0%)", "Realizations: 2"]) {
            expect(text).toContain(part);
        }
    });

    test("a distribution bar names P10/P90 and counts all its realizations", () => {
        const text = hoverText("rms_seed", "low");

        expect(text).toContain("P90");
        expect(text).toContain("Realizations: 4");
    });

    test("the empty side of a single-case scenario says so", () => {
        expect(hoverText("kvkh", "low")).toContain("No low case");
    });

    test("with both cases on one side, either bar describes both cases", () => {
        const text = hoverText("faultseal", "high");

        expect(text).toContain("above the reference");
        expect(text).toContain("high: 105, +5 (+5.0%)");
        expect(text).toContain("low: 115, +15 (+15.0%)");
        expect(hoverText("faultseal", "low")).toBe(text);
    });

    test("the percentage sign follows the difference for a negative reference", () => {
        const negativeDataset = computeSensitivitiesForResponse(
            sensitivities,
            { realizations: [1, 2, 3, 4, 5, 6, 7, 8], values: [-90, -100, -100, -110, -90, -90, -110, -110] },
            "rms_seed",
            SensitivitySortBy.ALPHABETICAL,
            false,
        );
        const fwl = negativeDataset.sensitivityResponses.find((r) => r.sensitivityName === "fwl")!;
        const templates = (["low", "high"] as const).map((side) =>
            makeTornadoBarHoverTemplate(fwl, side, negativeDataset.referenceAverage),
        );

        expect(templates.join()).not.toContain("+-");
        expect(templates.some((template) => template.includes("+10 (+10.0%)"))).toBe(true);
    });
});

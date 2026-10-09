import { describe, expect, test } from "vitest";

import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeSensitivitiesForResponse, SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";
import {
    makeSensitivityTableRows,
    sortSensitivityTableRows,
    type SensitivityTableRow,
} from "@modules/SensitivityPlot/view/utils/sensitivityTableRows";

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
    { name: "minpv", type: SensitivityType.SCENARIO, cases: [{ name: "low", realizations: [9, 10] }] },
    { name: "kvkh", type: SensitivityType.SCENARIO, cases: [{ name: "high", realizations: [11, 12] }] },
]);

// rms_seed mean 25; fwl 15/35; minpv below (5), kvkh above (45) the reference.
const dataset = computeSensitivitiesForResponse(
    sensitivities,
    {
        realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        values: [10, 20, 30, 40, 15, 15, 35, 35, 5, 5, 45, 45],
        name: "STOIIP",
    },
    "rms_seed",
    SensitivitySortBy.ALPHABETICAL,
    false,
);
const rows = makeSensitivityTableRows([dataset]);

function row(sensitivity: string): SensitivityTableRow {
    return rows.find((r) => r.sensitivity === sensitivity)!;
}

describe("makeSensitivityTableRows", () => {
    test("a Monte Carlo row is a distribution with mean, P90, P10 and total realizations only", () => {
        expect(row("rms_seed")).toMatchObject({
            response: "STOIIP",
            type: "Distribution",
            mean: 25,
            avgLow: null,
            avgHigh: null,
            totalReals: 4,
            realsLow: null,
            realsHigh: null,
        });
        expect(row("rms_seed").p90).toBeLessThan(row("rms_seed").p10!);
    });

    test("a two-case scenario fills both averages and realization counts", () => {
        expect(row("fwl")).toMatchObject({
            type: "Scenario",
            mean: null,
            p90: null,
            p10: null,
            avgLow: 15,
            avgHigh: 35,
            totalReals: null,
            realsLow: 2,
            realsHigh: 2,
        });
    });

    test("a single-case scenario fills only the side its case is on", () => {
        expect(row("minpv")).toMatchObject({ avgLow: 5, avgHigh: null, realsLow: 2, realsHigh: null });
        expect(row("kvkh")).toMatchObject({ avgLow: null, avgHigh: 45, realsLow: null, realsHigh: 2 });
    });
});

describe("sortSensitivityTableRows", () => {
    test("rows without a value go last in both directions", () => {
        const ascending = sortSensitivityTableRows(rows, "avgHigh", "asc").map((r) => r.sensitivity);
        const descending = sortSensitivityTableRows(rows, "avgHigh", "desc").map((r) => r.sensitivity);

        expect(ascending.slice(0, 2)).toEqual(["fwl", "kvkh"]);
        expect(descending.slice(0, 2)).toEqual(["kvkh", "fwl"]);
        expect(ascending.slice(2).sort()).toEqual(["minpv", "rms_seed"]);
        expect(descending.slice(2).sort()).toEqual(["minpv", "rms_seed"]);
    });
});

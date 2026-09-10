import { describe, expect, test } from "vitest";

import type { VectorRealizationData_api } from "@api";
import {
    countCumulativeVectorNonZeroRealizations,
    determineSalesGasStrategy,
    deriveSalesGasCumulative,
    isCumulativeVectorAllZero,
} from "@modules/EconomicScreening/utils/vectorResolution";

function makeVectorData(realization: number, timestampsUtcMs: number[], values: number[]): VectorRealizationData_api {
    return {
        realization,
        timestampsUtcMs,
        values,
        unit: "SM3",
        isRate: false,
    } as VectorRealizationData_api;
}

describe("determineSalesGasStrategy", () => {
    test("prefers FGST when available", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGST", "FGPT", "FGCT"])).toEqual({
            kind: "DIRECT",
            hasGasConsumption: true,
        });
    });

    test("reports unavailable consumption even when FGST is used directly", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGST", "FGPT"])).toEqual({
            kind: "DIRECT",
            hasGasConsumption: false,
        });
    });

    test("falls back to deriving from the gas components", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGPT", "FGIT"])).toEqual({
            kind: "DERIVED",
            hasGasProduction: true,
            hasGasInjection: true,
            hasGasConsumption: false,
        });
    });

    test("is unavailable without FGST and FGPT", () => {
        expect(determineSalesGasStrategy(["FOPT"])).toEqual({ kind: "UNAVAILABLE" });
    });
});

describe("deriveSalesGasCumulative", () => {
    const timestamps = [0, 1000];

    test("subtracts injection and consumption from production", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200])],
            [makeVectorData(0, timestamps, [10, 20])],
            [makeVectorData(0, timestamps, [1, 2])],
        );

        expect(result.series).toEqual([{ realization: 0, timestampsUtcMs: timestamps, values: [89, 178] }]);
    });

    test("does not treat an unavailable component as zero without an explicit assumption", () => {
        const result = deriveSalesGasCumulative([makeVectorData(0, timestamps, [100, 200])], [], []);

        expect(result.series).toEqual([]);
        expect(result.missingInjectionRealizations).toEqual([0]);
        expect(result.missingConsumptionRealizations).toEqual([0]);
    });

    test("aligns components on timestamps rather than position", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, [0, 1000], [100, 200])],
            [makeVectorData(0, [1000], [50])],
            [],
            { assumeMissingConsumptionAsZero: true },
        );

        expect(result.series).toEqual([]);
        expect(result.incompleteInjectionRealizations).toEqual([0]);
    });

    test("matches components by realization", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200]), makeVectorData(1, timestamps, [300, 400])],
            [makeVectorData(1, timestamps, [30, 40])],
            [],
            { assumeMissingConsumptionAsZero: true },
        );

        expect(result.series).toEqual([{ realization: 1, timestampsUtcMs: timestamps, values: [270, 360] }]);
        expect(result.missingInjectionRealizations).toEqual([0]);
    });

    test("uses an explicitly accepted missing-component assumption only for an absent vector", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200])],
            [],
            [makeVectorData(0, timestamps, [1, 2])],
            { assumeMissingInjectionAsZero: true },
        );

        expect(result.series).toEqual([{ realization: 0, timestampsUtcMs: timestamps, values: [99, 198] }]);
    });
});

describe("isCumulativeVectorAllZero", () => {
    test("is true when every realization ends at zero", () => {
        expect(isCumulativeVectorAllZero([makeVectorData(0, [0, 1], [0, 0])])).toBe(true);
    });

    test("is false when any realization ends above zero", () => {
        expect(isCumulativeVectorAllZero([makeVectorData(0, [0, 1], [0, 0]), makeVectorData(1, [0, 1], [0, 5])])).toBe(
            false,
        );
    });

    test("is false for no data because zero consumption is not confirmed", () => {
        expect(isCumulativeVectorAllZero([])).toBe(false);
    });
});

test("counts realizations with non-zero terminal consumption", () => {
    expect(
        countCumulativeVectorNonZeroRealizations([
            makeVectorData(1, [0, 1], [0, 0]),
            makeVectorData(2, [0, 1], [0, 5]),
            makeVectorData(3, [0, 1], [0, -2]),
        ]),
    ).toBe(2);
});

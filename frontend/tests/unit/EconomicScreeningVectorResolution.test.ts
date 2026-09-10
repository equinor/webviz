import { describe, expect, test } from "vitest";

import type { VectorRealizationData_api } from "@api";
import {
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
        expect(determineSalesGasStrategy(["FOPT", "FGST", "FGPT"])).toEqual({ kind: "DIRECT" });
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

        expect(result).toEqual([{ realization: 0, timestampsUtcMs: timestamps, values: [89, 178] }]);
    });

    test("treats missing components as zero", () => {
        const result = deriveSalesGasCumulative([makeVectorData(0, timestamps, [100, 200])], [], []);

        expect(result[0].values).toEqual([100, 200]);
    });

    test("aligns components on timestamps rather than position", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, [0, 1000], [100, 200])],
            [makeVectorData(0, [1000], [50])],
            [],
        );

        expect(result[0].values).toEqual([100, 150]);
    });

    test("matches components by realization", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200]), makeVectorData(1, timestamps, [300, 400])],
            [makeVectorData(1, timestamps, [30, 40])],
            [],
        );

        expect(result[0].values).toEqual([100, 200]);
        expect(result[1].values).toEqual([270, 360]);
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

    test("is true for no data at all", () => {
        expect(isCumulativeVectorAllZero([])).toBe(true);
    });
});

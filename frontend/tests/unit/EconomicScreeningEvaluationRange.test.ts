import { describe, expect, test } from "vitest";

import { monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import { getPredictionHorizonError } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

describe("getPredictionHorizonError", () => {
    test("requires an explicit prediction start year", () => {
        expect(getPredictionHorizonError(null, monthIndexOf(2040, 12))).toBe(
            "Enter a prediction start year to calculate results.",
        );
    });

    test("requires source coverage to establish the simulation end", () => {
        expect(getPredictionHorizonError(2030, null)).toBe(
            "Source coverage is unavailable, so the simulation end cannot be established.",
        );
    });

    test("rejects a start after the supported end and accepts a start in the final supported year", () => {
        expect(getPredictionHorizonError(2031, monthIndexOf(2030, 12))).toBe(
            "The prediction start year 2031 is after the supported simulation end (Dec 2030).",
        );
        expect(getPredictionHorizonError(2030, monthIndexOf(2030, 3))).toBeNull();
    });

    test("accepts a start before production for cost-only years", () => {
        expect(getPredictionHorizonError(2019, monthIndexOf(2021, 12))).toBeNull();
    });
});
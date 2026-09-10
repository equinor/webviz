import { describe, expect, test } from "vitest";

import {
    getCostYearsOutsideEvaluationWindow,
    parseCostProfilePaste,
    validateCostProfile,
} from "@modules/EconomicScreening/settings/components/costProfileEditor";

describe("validateCostProfile", () => {
    test("rejects blank years while allowing blank cost cells to resolve as zero", () => {
        expect(validateCostProfile([{ year: null, capex: 0, opex: 0 }], false)).toBe(
            "Enter a calendar year for each cost row.",
        );
    });

    test("rejects duplicate calendar years", () => {
        expect(
            validateCostProfile(
                [
                    { year: 2025, capex: 10, opex: 5 },
                    { year: 2025, capex: 20, opex: 10 },
                ],
                false,
            ),
        ).toBe("Each calendar year can appear only once.");
    });

    test("rejects negative costs for regular ensembles", () => {
        expect(validateCostProfile([{ year: 2025, capex: -1, opex: 0 }], false)).toBe(
            "Investment and operating costs must be zero or greater.",
        );
    });

    test("allows signed costs for delta ensembles", () => {
        expect(validateCostProfile([{ year: 2025, capex: -1, opex: -2 }], true)).toBeNull();
    });
});

describe("parseCostProfilePaste", () => {
    test("parses a tabular year, CAPEX, and OPEX range", () => {
        expect(parseCostProfilePaste("2025\t10\t\n2026\t20\t30")).toEqual({
            entries: [
                { year: 2025, capex: 10, opex: 0 },
                { year: 2026, capex: 20, opex: 30 },
            ],
        });
    });

    test("rejects a non-tabular paste", () => {
        expect(parseCostProfilePaste("2025\t10")).toEqual({
            error: "Paste year, investment, and operating cost values in three tab-separated columns.",
        });
    });
});

describe("getCostYearsOutsideEvaluationWindow", () => {
    test("identifies costs excluded by an explicit evaluation range", () => {
        expect(
            getCostYearsOutsideEvaluationWindow(
                [
                    { year: 2024, capex: 0, opex: 0 },
                    { year: 2025, capex: 0, opex: 0 },
                    { year: 2027, capex: 0, opex: 0 },
                ],
                { firstYear: 2025, lastYear: 2026 },
            ),
        ).toEqual([2024, 2027]);
    });
});

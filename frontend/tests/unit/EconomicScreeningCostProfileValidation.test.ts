import { describe, expect, test } from "vitest";

import {
    getCostYearsOutsideRange,
    parseCostProfilePaste,
    setCostEntry,
    validateCostProfile,
    validatePastedCostYears,
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

describe("getCostYearsOutsideRange", () => {
    test("identifies non-zero stored costs outside the generated years", () => {
        expect(
            getCostYearsOutsideRange(
                [
                    { year: 2024, capex: 10, opex: 0 },
                    { year: 2025, capex: 0, opex: 5 },
                    { year: 2027, capex: 0, opex: 3 },
                    { year: 2028, capex: 0, opex: 0 },
                ],
                2025,
                2026,
            ),
        ).toEqual([2024, 2027]);
    });

    test("lists every non-zero stored cost while no cost years are available", () => {
        expect(getCostYearsOutsideRange([{ year: 2030, capex: 1, opex: 0 }], null, 2040)).toEqual([2030]);
    });
});

describe("validatePastedCostYears", () => {
    test("accepts distinct generated years in any order", () => {
        expect(
            validatePastedCostYears(
                [
                    { year: 2026, capex: 1, opex: 0 },
                    { year: 2025, capex: 1, opex: 0 },
                ],
                2025,
                2026,
            ),
        ).toBeNull();
    });

    test("rejects pasted years outside the generated range", () => {
        expect(validatePastedCostYears([{ year: 2027, capex: 1, opex: 0 }], 2025, 2026)).toBe(
            "Pasted year 2027 is outside the cost years 2025-2026.",
        );
    });

    test("rejects duplicate pasted years", () => {
        expect(
            validatePastedCostYears(
                [
                    { year: 2025, capex: 1, opex: 0 },
                    { year: 2025, capex: 2, opex: 0 },
                ],
                2025,
                2026,
            ),
        ).toBe("Pasted year 2025 appears more than once.");
    });
});

describe("setCostEntry", () => {
    test("replaces a year, keeps other entries including out-of-range ones, and drops all-zero entries", () => {
        const stored = [
            { year: 2020, capex: 900, opex: 0 },
            { year: 2031, capex: 5, opex: 1 },
        ];

        expect(setCostEntry(stored, { year: 2030, capex: -10, opex: 0 })).toEqual([
            { year: 2020, capex: 900, opex: 0 },
            { year: 2030, capex: -10, opex: 0 },
            { year: 2031, capex: 5, opex: 1 },
        ]);
        expect(setCostEntry(stored, { year: 2031, capex: 0, opex: 0 })).toEqual([{ year: 2020, capex: 900, opex: 0 }]);
    });
});

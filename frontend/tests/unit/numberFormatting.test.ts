import { describe, expect, test } from "vitest";

import {
    formatCommonScaleUnit,
    formatNumber,
    formatWithCommonScale,
    makeCommonNumberScale,
} from "../../src/modules/_shared/utils/numberFormatting";

describe("formatNumber", () => {
    describe("default (significant digits, 3 sig figs)", () => {
        test("integers are shown exactly", () => {
            expect(formatNumber(1234)).toBe("1234");
            expect(formatNumber(0)).toBe("0");
            expect(formatNumber(-42)).toBe("-42");
            expect(formatNumber(1000000)).toBe("1000000");
        });

        test("non-integer values are rounded to 3 significant digits", () => {
            expect(formatNumber(1.234)).toBe("1.23");
            expect(formatNumber(0.00234)).toBe("0.00234");
            expect(formatNumber(12.345)).toBe("12.3");
            expect(formatNumber(123.45)).toBe("123");
            expect(formatNumber(-1.234)).toBe("-1.23");
        });

        test("trailing zeros are stripped", () => {
            expect(formatNumber(1.0)).toBe("1");
            expect(formatNumber(1.10)).toBe("1.1");
            expect(formatNumber(1.200)).toBe("1.2");
        });

        test("non-finite values", () => {
            expect(formatNumber(Infinity)).toBe("Infinity");
            expect(formatNumber(-Infinity)).toBe("-Infinity");
            expect(formatNumber(NaN)).toBe("NaN");
        });
    });

    describe("numSignificantDigits option", () => {
        test("respects custom significant digit count", () => {
            expect(formatNumber(1.23456, { numSignificantDigits: 2 })).toBe("1.2");
            expect(formatNumber(1.23456, { numSignificantDigits: 4 })).toBe("1.235");
            expect(formatNumber(0.0012345, { numSignificantDigits: 2 })).toBe("0.0012");
        });
    });

    describe("maxNumDecimalPlaces option", () => {
        test("limits decimal places", () => {
            expect(formatNumber(1.234, { maxNumDecimalPlaces: 2 })).toBe("1.23");
            expect(formatNumber(1.234, { maxNumDecimalPlaces: 0 })).toBe("1");
            expect(formatNumber(1234, { maxNumDecimalPlaces: 2 })).toBe("1234");
            expect(formatNumber(1234, { maxNumDecimalPlaces: 0 })).toBe("1234");
        });

        test("strips trailing zeros", () => {
            expect(formatNumber(1.5, { maxNumDecimalPlaces: 3 })).toBe("1.5");
            expect(formatNumber(1.0, { maxNumDecimalPlaces: 2 })).toBe("1");
        });

        test("negative values", () => {
            expect(formatNumber(-1.234, { maxNumDecimalPlaces: 2 })).toBe("-1.23");
        });
    });

    describe("unit label", () => {
        test("appends unit with a space when no prefix", () => {
            expect(formatNumber(1.234, { unit: "m" })).toBe("1.23 m");
            expect(formatNumber(0, { unit: "m" })).toBe("0 m");
            expect(formatNumber(1234, { unit: "Hz" })).toBe("1234 Hz");
        });
    });

    describe("notation: scientific", () => {
        test("uses e-notation with sig-figs decimal count by default", () => {
            expect(formatNumber(1234, { notation: "scientific" })).toBe("1.23e+3");
            expect(formatNumber(0.00234, { notation: "scientific" })).toBe("2.34e-3");
            expect(formatNumber(1, { notation: "scientific" })).toBe("1.00e+0");
        });

        test("respects maxNumDecimalPlaces for the mantissa", () => {
            expect(formatNumber(1234, { notation: "scientific", maxNumDecimalPlaces: 1 })).toBe("1.2e+3");
            expect(formatNumber(1234, { notation: "scientific", maxNumDecimalPlaces: 0 })).toBe("1e+3");
        });

        test("negative values", () => {
            expect(formatNumber(-1234, { notation: "scientific" })).toBe("-1.23e+3");
        });

        test("appends unit", () => {
            expect(formatNumber(1234, { notation: "scientific", unit: "Hz" })).toBe("1.23e+3 Hz");
        });
    });

    describe("notation: engineering", () => {
        test("exponent is always a multiple of 3", () => {
            expect(formatNumber(1234, { notation: "engineering" })).toBe("1.23e+3");
            expect(formatNumber(12340, { notation: "engineering" })).toBe("12.3e+3");
            expect(formatNumber(123400, { notation: "engineering" })).toBe("123e+3");
            expect(formatNumber(0.00234, { notation: "engineering" })).toBe("2.34e-3");
            expect(formatNumber(0.0234, { notation: "engineering" })).toBe("23.4e-3");
        });

        test("omits exponent when it is 0", () => {
            expect(formatNumber(1, { notation: "engineering" })).toBe("1");
            expect(formatNumber(12.3, { notation: "engineering" })).toBe("12.3");
            expect(formatNumber(999, { notation: "engineering" })).toBe("999");
        });

        test("handles rollover at sig-fig boundary", () => {
            // 999.9 with 3 sig figs rounds to 1000, which should carry over to next exponent
            expect(formatNumber(999.9, { notation: "engineering" })).toBe("1e+3");
        });

        test("negative values", () => {
            expect(formatNumber(-1234, { notation: "engineering" })).toBe("-1.23e+3");
        });
    });

    describe("unitSystem: si", () => {
        test("selects the correct SI prefix", () => {
            expect(formatNumber(1e15, { unitSystem: "si" })).toBe("1 P");
            expect(formatNumber(1e12, { unitSystem: "si" })).toBe("1 T");
            expect(formatNumber(1e9, { unitSystem: "si" })).toBe("1 G");
            expect(formatNumber(1e6, { unitSystem: "si" })).toBe("1 M");
            expect(formatNumber(1e3, { unitSystem: "si" })).toBe("1 k");
            expect(formatNumber(1, { unitSystem: "si" })).toBe("1");
            expect(formatNumber(1e-3, { unitSystem: "si" })).toBe("1 m");
            expect(formatNumber(1e-6, { unitSystem: "si" })).toBe("1 μ");
            expect(formatNumber(1e-9, { unitSystem: "si" })).toBe("1 n");
            expect(formatNumber(1e-12, { unitSystem: "si" })).toBe("1 p");
            expect(formatNumber(1e-15, { unitSystem: "si" })).toBe("1 f");
        });

        test("scales and formats with sig figs", () => {
            expect(formatNumber(1234, { unitSystem: "si", unit: "m" })).toBe("1.23 km");
            expect(formatNumber(1234567, { unitSystem: "si", unit: "Hz" })).toBe("1.23 MHz");
            expect(formatNumber(0.00234, { unitSystem: "si", unit: "m" })).toBe("2.34 mm");
        });

        test("handles prefix rollover (999.9 → 1 k not 1000)", () => {
            expect(formatNumber(999900, { unitSystem: "si", unit: "m" })).toBe("1 Mm");
        });

        test("no prefix when value is in base range (1–999)", () => {
            expect(formatNumber(500, { unitSystem: "si", unit: "m" })).toBe("500 m");
        });

        test("no suffix when prefix and unit are both empty", () => {
            expect(formatNumber(1, { unitSystem: "si" })).toBe("1");
        });

        test("negative values", () => {
            expect(formatNumber(-1234, { unitSystem: "si", unit: "m" })).toBe("-1.23 km");
        });

        test("respects maxNumDecimalPlaces", () => {
            expect(formatNumber(1234, { unitSystem: "si", unit: "m", maxNumDecimalPlaces: 1 })).toBe("1.2 km");
        });

        test("can suppress prefixes below the base unit", () => {
            expect(formatNumber(0.25, { unitSystem: "si", useSubUnitPrefixes: false })).toBe("0.25");
            expect(formatNumber(0.00234, { unitSystem: "si", useSubUnitPrefixes: false })).toBe("0.00234");
            expect(formatNumber(1234, { unitSystem: "si", useSubUnitPrefixes: false })).toBe("1.23 k");
        });
    });

    describe("unitSystem: binary", () => {
        test("selects the correct binary prefix", () => {
            expect(formatNumber(2 ** 10, { unitSystem: "binary", unit: "B" })).toBe("1 KiB");
            expect(formatNumber(2 ** 20, { unitSystem: "binary", unit: "B" })).toBe("1 MiB");
            expect(formatNumber(2 ** 30, { unitSystem: "binary", unit: "B" })).toBe("1 GiB");
            expect(formatNumber(2 ** 40, { unitSystem: "binary", unit: "B" })).toBe("1 TiB");
            expect(formatNumber(2 ** 50, { unitSystem: "binary", unit: "B" })).toBe("1 PiB");
        });

        test("no prefix for values below 1024", () => {
            expect(formatNumber(512, { unitSystem: "binary", unit: "B" })).toBe("512 B");
        });

        test("scales non-power-of-two values", () => {
            expect(formatNumber(1536, { unitSystem: "binary", unit: "B" })).toBe("1.5 KiB");
            expect(formatNumber(1073741824 * 1.5, { unitSystem: "binary", unit: "B" })).toBe("1.5 GiB");
        });

        test("negative values", () => {
            expect(formatNumber(-Math.pow(2, 20), { unitSystem: "binary", unit: "B" })).toBe("-1 MiB");
        });

        test("without unit label", () => {
            expect(formatNumber(2 ** 10, { unitSystem: "binary" })).toBe("1 Ki");
        });
    });
});

describe("makeCommonNumberScale", () => {
    test("gives every value the prefix and decimals of the largest magnitude", () => {
        const scale = makeCommonNumberScale([5.38e6, 6.2432e6, 7.176e6, 9.5e5]);
        expect(scale).toEqual({ factor: 1e6, prefix: "M", style: "si", numDecimalPlaces: 2 });
        expect([5.38e6, 6.2432e6, 9.5e5].map((value) => formatWithCommonScale(value, scale))).toEqual([
            "5.38",
            "6.24",
            "0.95",
        ]);
        expect(formatCommonScaleUnit(scale, "Sm³")).toBe("MSm³");
    });

    test("uses words for the words style, and negative values for magnitude", () => {
        const scale = makeCommonNumberScale([-3.312e9, 2.1e9], { style: "words" });
        expect(scale).toEqual({ factor: 1e9, prefix: "billion", style: "words", numDecimalPlaces: 2 });
        expect(formatWithCommonScale(-3.312e9, scale)).toBe("-3.31");
        expect(formatCommonScaleUnit(scale, "USD")).toBe("billion USD");
    });

    test("moves to the next prefix when rounding reaches it", () => {
        expect(makeCommonNumberScale([999_600])).toMatchObject({ factor: 1e6, prefix: "M", numDecimalPlaces: 2 });
    });

    test("keeps values below 1000 unscaled with significant decimals", () => {
        const scale = makeCommonNumberScale([12.345, 0.5]);
        expect(scale).toEqual({ factor: 1, prefix: "", style: "si", numDecimalPlaces: 1 });
        expect(formatWithCommonScale(0.5, scale)).toBe("0.5");
        expect(formatCommonScaleUnit(scale, "%")).toBe("%");
        expect(makeCommonNumberScale([0.25]).numDecimalPlaces).toBe(3);
    });

    test("handles empty, zero and non-finite input", () => {
        expect(makeCommonNumberScale([])).toEqual({ factor: 1, prefix: "", style: "si", numDecimalPlaces: 0 });
        expect(makeCommonNumberScale([0, Number.NaN])).toMatchObject({ factor: 1, numDecimalPlaces: 0 });
        expect(formatWithCommonScale(-0.001, makeCommonNumberScale([10]))).toBe("0.0");
        expect(formatWithCommonScale(Number.NaN, makeCommonNumberScale([10]))).toBe("NaN");
    });
});

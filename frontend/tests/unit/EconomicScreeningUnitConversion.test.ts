import { describe, expect, test } from "vitest";

import { GasPriceBasis, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";
import {
    convertGasPriceToSimulatorUnit,
    convertGasToOilEquivalentFactorToSimulatorUnit,
    convertOilPriceFromSimulatorUnit,
    convertOilPriceToSimulatorUnit,
    volumeUnitInSm3,
} from "@modules/EconomicScreening/utils/unitConversion";

describe("volumeUnitInSm3", () => {
    test("recognises units regardless of casing and padding", () => {
        expect(volumeUnitInSm3(" sm3 ")).toBe(1);
    });

    test("returns null for unknown units", () => {
        expect(volumeUnitInSm3("BANANAS")).toBeNull();
    });
});

describe("convertOilPriceToSimulatorUnit", () => {
    test("passes the price through when the bases match", () => {
        expect(convertOilPriceToSimulatorUnit(70, OilPriceBasis.PER_SM3, "SM3")).toBeCloseTo(70, 10);
    });

    test("scales a per-barrel price up to a per-Sm³ price", () => {
        const result = convertOilPriceToSimulatorUnit(70, OilPriceBasis.PER_BBL, "SM3");

        expect(result).toBeCloseTo(70 * 6.2898, 2);
    });

    test("returns null for an unrecognised simulator unit", () => {
        expect(convertOilPriceToSimulatorUnit(70, OilPriceBasis.PER_BBL, "???")).toBeNull();
    });
});

describe("convertOilPriceFromSimulatorUnit", () => {
    test("converts a per-Sm³ break-even price to the selected per-barrel basis", () => {
        expect(convertOilPriceFromSimulatorUnit(70 * 6.2898, OilPriceBasis.PER_BBL, "SM3")).toBeCloseTo(70, 2);
    });

    test("returns null for an unrecognised simulator unit", () => {
        expect(convertOilPriceFromSimulatorUnit(70, OilPriceBasis.PER_BBL, "???")).toBeNull();
    });
});

describe("convertGasPriceToSimulatorUnit", () => {
    test("scales a per-Mscf price down to a per-Sm³ price", () => {
        const result = convertGasPriceToSimulatorUnit(3, GasPriceBasis.PER_MSCF, "SM3");

        expect(result).toBeCloseTo(3 / 28.3168, 4);
    });
});

describe("convertGasToOilEquivalentFactorToSimulatorUnit", () => {
    test("is unchanged when both vectors are in Sm³", () => {
        expect(convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "SM3")).toBeCloseTo(1000, 10);
    });

    test("accounts for gas reported in Mscf", () => {
        const divisor = convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "MSCF");

        // 1000 Sm³ of gas is roughly 35.3 Mscf, so the divisor shrinks accordingly.
        expect(divisor).toBeCloseTo(35.3147, 3);
    });

    test("returns null when either unit is unknown", () => {
        expect(convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "???")).toBeNull();
    });
});

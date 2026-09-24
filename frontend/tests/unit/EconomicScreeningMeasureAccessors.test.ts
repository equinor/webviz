import { describe, expect, test } from "vitest";

import { EconomicMeasure, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";
import {
    getMeasureDisplayName,
    getMeasureDisplayScale,
    getMeasureUnit,
} from "@modules/EconomicScreening/utils/measureAccessors";

describe("getMeasureDisplayName", () => {
    test("labels financial Delta measures as incremental", () => {
        expect(getMeasureDisplayName(EconomicMeasure.NPV, true)).toBe("Incremental net present value");
        expect(getMeasureDisplayName(EconomicMeasure.IRR, true)).toBe("Incremental internal rate of return");
        expect(getMeasureDisplayName(EconomicMeasure.BREAK_EVEN_OIL_PRICE, true)).toBe(
            "Incremental break-even oil price",
        );
    });

    test("keeps regular measure labels unchanged", () => {
        expect(getMeasureDisplayName(EconomicMeasure.NPV)).toBe("Net present value");
        expect(getMeasureDisplayName(EconomicMeasure.DISCOUNTED_OIL_VOLUME, true)).toBe("Discounted oil volume");
    });
});

describe("getMeasureUnit", () => {
    test("labels the break-even price with currency and volume basis like the price inputs", () => {
        const context = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD" };
        expect(
            getMeasureUnit(EconomicMeasure.BREAK_EVEN_OIL_PRICE, { ...context, oilPriceBasis: OilPriceBasis.PER_SM3 }),
        ).toBe("USD per Sm³");
        expect(
            getMeasureUnit(EconomicMeasure.BREAK_EVEN_OIL_PRICE, { ...context, oilPriceBasis: OilPriceBasis.PER_BBL }),
        ).toBe("USD per bbl");
    });
});

describe("getMeasureDisplayScale", () => {
    test("uses one explicit billion-currency scale for a large NPV distribution", () => {
        expect(getMeasureDisplayScale(EconomicMeasure.NPV, [3.312e9, -2.1e9], "USD")).toEqual({
            factor: 1e9,
            unit: "billion USD",
        });
    });

    test("does not scale non-financial measures", () => {
        expect(getMeasureDisplayScale(EconomicMeasure.DISCOUNTED_OIL_VOLUME, [3.312e9], "Sm3")).toEqual({
            factor: 1,
            unit: "Sm3",
        });
    });
});

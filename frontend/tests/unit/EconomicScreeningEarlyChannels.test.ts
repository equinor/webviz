import { describe, expect, test } from "vitest";

import { EARLY_MEASURE_CHANNEL_ID_MAP, channelDefs } from "@modules/EconomicScreening/channelDefs";
import { makeEarlyMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import { EarlyEconomicMeasure, DiscountConvention } from "@modules/EconomicScreening/typesAndEnums";
import { computeRealizationEconomics } from "@modules/EconomicScreening/utils/economicCalculations";

const result = computeRealizationEconomics(
    {
        realization: 12,
        years: [2020, 2021],
        oilVolumes: [10, 20],
        salesGasVolumes: [0, 0],
        hasOilData: true,
        hasSalesGasData: false,
    },
    {
        discountRateFraction: 0,
        baseYear: 2020,
        convention: DiscountConvention.YEAR_END,
        gasToOilEquivalentDivisor: 1000,
        oilPricePerVolume: 1,
        gasPricePerVolume: null,
        excludeGasRevenue: true,
    },
    [],
    { firstYear: null, lastYear: null },
);

describe("makeEarlyMeasureDataGenerator", () => {
    test("publishes the selected cumulative horizon", () => {
        const generated = makeEarlyMeasureDataGenerator(
            [result],
            EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME,
            2020,
            "SM3",
            "ensemble",
            "Ensemble",
            "#000",
        )();

        expect(generated.data).toEqual([{ key: 12, value: 10 }]);
        expect(generated.metaData.displayString).toBe("Through 2020: Ensemble");
    });

    test("does not publish unavailable product data as zero", () => {
        const generated = makeEarlyMeasureDataGenerator(
            [result],
            EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME,
            2020,
            "SM3",
            "ensemble",
            "Ensemble",
            "#000",
        )();

        expect(generated.data).toEqual([]);
    });

    test("includes compact assumption provenance in the channel metadata", () => {
        const generated = makeEarlyMeasureDataGenerator(
            [result],
            EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW,
            2020,
            "USD",
            "ensemble",
            "Ensemble",
            "#000",
            "Discount rate 8%",
        )();

        expect(generated.metaData.displayString).toBe("Through 2020: Ensemble; Discount rate 8%");
    });
});

test("registers stable early-value realization channels", () => {
    expect(channelDefs.map((definition) => definition.idString)).toEqual(
        expect.arrayContaining(Object.values(EARLY_MEASURE_CHANNEL_ID_MAP)),
    );
});

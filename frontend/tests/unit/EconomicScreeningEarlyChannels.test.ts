import { describe, expect, test } from "vitest";

import { EARLY_MEASURE_CHANNEL_ID_MAP, channelDefs } from "@modules/EconomicScreening/channelDefs";
import { makeEarlyMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import { EarlyEconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { computeMonthlyRealizationEconomics } from "@modules/EconomicScreening/utils/monthlyEconomics";
import { MonthCoverage, monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";

const oilVolumes = [10, ...new Array(11).fill(0), 20, ...new Array(11).fill(0)];

const result = computeMonthlyRealizationEconomics(
    {
        realization: 12,
        oilProfile: {
            months: oilVolumes.map((volume, index) => ({
                year: 2020 + Math.floor(index / 12),
                month: (index % 12) + 1,
                volume,
                coverage: MonthCoverage.SOURCE_ALIGNED,
            })),
            totalIncrement: 30,
            rejection: null,
        },
        salesGasProfile: null,
    },
    {
        discountRateFraction: 0,
        predictionStartYear: 2020,
        horizonEndMonthIndex: monthIndexOf(2021, 12),
        gasToOilEquivalentDivisor: 1000,
        oilPricePerVolume: 1,
        gasPricePerVolume: 0,
        earlyEndYear: 2020,
    },
    [],
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

    test("does not publish values computed for a different early year", () => {
        const generated = makeEarlyMeasureDataGenerator(
            [result],
            EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME,
            2021,
            "SM3",
            "ensemble",
            "Ensemble",
            "#000",
        )();

        expect(generated.data).toEqual([]);
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

import { describe, expect, test } from "vitest";

import {
    aggregateAnnualVolumeProfiles,
    aggregateCashFlowProfiles,
} from "@modules/EconomicScreening/utils/timeProfileAggregation";

describe("aggregateCashFlowProfiles", () => {
    test("uses a common complete cohort and quantiles each cumulative profile directly", () => {
        const aggregate = aggregateCashFlowProfiles([
            {
                realization: 1,
                years: [2020, 2021],
                netCashFlow: [10, 20],
                cumulativeDiscountedCashFlow: [5, 15],
            },
            {
                realization: 2,
                years: [2020, 2021],
                netCashFlow: [30, 40],
                cumulativeDiscountedCashFlow: [20, 60],
            },
            {
                realization: 3,
                years: [2020],
                netCashFlow: [50],
                cumulativeDiscountedCashFlow: [50],
            },
        ]);

        expect(aggregate).toEqual({
            realizations: [1, 2],
            years: [2020, 2021],
            annualNetCashFlow: { median: [20, 30], p90: [12, 22], p10: [28, 38] },
            cumulativeDiscountedCashFlow: { median: [12.5, 37.5], p90: [6.5, 19.5], p10: [18.5, 55.5] },
        });
    });

    test("preserves each realization's final cumulative discounted value", () => {
        const aggregate = aggregateCashFlowProfiles([
            {
                realization: 1,
                years: [2020, 2021],
                netCashFlow: [-100, 120],
                cumulativeDiscountedCashFlow: [-100, 10],
            },
        ]);

        expect(aggregate?.cumulativeDiscountedCashFlow.median.at(-1)).toBe(10);
    });

    test("returns unavailable when no realization covers the full horizon", () => {
        expect(
            aggregateCashFlowProfiles([
                { realization: 1, years: [2020], netCashFlow: [10], cumulativeDiscountedCashFlow: [10] },
                { realization: 2, years: [2021], netCashFlow: [20], cumulativeDiscountedCashFlow: [20] },
            ]),
        ).toBeNull();
    });
});

describe("aggregateAnnualVolumeProfiles", () => {
    test("retains only complete product profiles across the full horizon", () => {
        expect(
            aggregateAnnualVolumeProfiles([
                { realization: 1, years: [2020, 2021], values: [10, 20], hasData: true },
                { realization: 2, years: [2020, 2021], values: [30, 40], hasData: true },
                { realization: 3, years: [2020], values: [50], hasData: true },
                { realization: 4, years: [2020, 2021], values: [60, 70], hasData: false },
            ]),
        ).toEqual({
            realizations: [1, 2],
            years: [2020, 2021],
            median: [20, 30],
            p90: [12, 22],
            p10: [28, 38],
        });
    });
});

import { SensitivityType, type Sensitivity } from "@framework/EnsembleSensitivities";

/** Source inputs shared by the connected-consumer harness and its spec; expected outputs are derived in the spec. */
export const DESIGN_CASE_UUID = "d0000000-0000-4000-8000-000000000001";
export const BASE_CASE_UUID = "b0000000-0000-4000-8000-000000000002";
export const DESIGN_ENSEMBLE_NAME = "Design";
export const BASE_ENSEMBLE_NAME = "Base";

export const DESIGN_REALIZATIONS = [2, 5, 9, 14, 20, 33, 40];
export const BASE_REALIZATIONS = [2, 5, 9, 14, 20, 33, 41];
export const DELTA_REALIZATIONS = [2, 5, 9, 14, 20, 33];
/** Its oil source ends mid-December of the final year, so only full-horizon oil results are unavailable. */
export const PARTIAL_OIL_REALIZATION = 5;

export const DESIGN_SENSITIVITIES: Sensitivity[] = [
    { name: "rms_seed", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [2, 5, 40] }] },
    {
        name: "poro",
        type: SensitivityType.SCENARIO,
        cases: [
            { name: "poro_low", realizations: [9] },
            { name: "poro_high", realizations: [14] },
        ],
    },
    {
        name: "perm",
        type: SensitivityType.SCENARIO,
        cases: [
            { name: "perm_low", realizations: [20] },
            { name: "perm_high", realizations: [33] },
        ],
    },
];

export const PREDICTION_START_YEAR = 2030;
export const FIRST_PRODUCTION_YEAR = 2031;
export const EVALUATION_END_YEAR = 2032;
export const DISCOUNT_RATE_PERCENT = 10;
export const OIL_PRICE_USD_PER_SM3 = 50;
export const GAS_PRICE_USD_PER_SM3 = 0.2;
export const CAPEX_2030_USD = 1_000_000;
export const GAS_SM3_PER_OIL_SM3 = 100;

/** Monthly oil volume in 2031-2032; 2030 is covered with zero production. Sales gas is 100 times oil. */
export const DESIGN_MONTHLY_OIL: Record<number, number> = {
    2: 1000,
    5: 1200,
    9: 600,
    14: 2000,
    20: 800,
    33: 1600,
    40: 1400,
};
export const BASE_MONTHLY_OIL: Record<number, number> = {
    2: 900,
    5: 900,
    9: 900,
    14: 900,
    20: 900,
    33: 900,
    41: 700,
};
/** Signed comparison-minus-reference monthly oil volume served by the delta endpoint. */
export const DELTA_MONTHLY_OIL: Record<number, number> = {
    2: -200,
    5: 900,
    9: -100,
    14: 1500,
    20: 300,
    33: -400,
};

const DAY_MS = 86_400_000;
const NUM_MONTHS = (EVALUATION_END_YEAR - PREDICTION_START_YEAR + 1) * 12;

function monthStartUtcMs(year: number, month: number): number {
    return Date.UTC(year, month - 1, 1);
}

/** API-shaped monthly cumulative series with source-aligned coverage for the whole evaluation. */
export function makeMonthlySeries(
    realization: number,
    productionMonthlyVolume: number,
    roles: string[],
    partialLastMonth = false,
) {
    const timestampsUtcMs = Array.from({ length: NUM_MONTHS + 1 }, (_, index) =>
        monthStartUtcMs(PREDICTION_START_YEAR, index + 1),
    );
    const firstProductionMonth = (FIRST_PRODUCTION_YEAR - PREDICTION_START_YEAR) * 12;
    const values = [0];
    for (let month = 0; month < NUM_MONTHS; month++) {
        values.push(values[month] + (month >= firstProductionMonth ? productionMonthlyVolume : 0));
    }
    const sourceEnd = partialLastMonth ? timestampsUtcMs[NUM_MONTHS - 1] + 15 * DAY_MS : timestampsUtcMs[NUM_MONTHS];
    return {
        realization,
        unit: "SM3",
        isRate: false,
        timestampsUtcMs,
        values,
        sourceCoverage: {
            interpolationMethod: "LINEAR",
            sources: roles.map((role) => ({
                role,
                firstTimestampUtcMs: timestampsUtcMs[0],
                lastTimestampUtcMs: sourceEnd,
                sampleCount: timestampsUtcMs.length,
                maxSampleGapMs: 31 * DAY_MS,
            })),
            intervals: timestampsUtcMs.slice(0, NUM_MONTHS).map((start, index) => {
                const isPartial = partialLastMonth && index === NUM_MONTHS - 1;
                return {
                    status: isPartial ? "PARTIAL" : "SOURCE_ALIGNED",
                    supportedStartUtcMs: start,
                    supportedEndUtcMs: isPartial ? sourceEnd : timestampsUtcMs[index + 1],
                };
            }),
        },
    };
}

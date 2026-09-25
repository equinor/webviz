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
    const firstProductionMonth = (FIRST_PRODUCTION_YEAR - PREDICTION_START_YEAR) * 12;
    const monthlyVolumes = Array.from({ length: NUM_MONTHS }, (_, month) =>
        month >= firstProductionMonth ? productionMonthlyVolume : 0,
    );
    const sourceEnd = partialLastMonth
        ? monthStartUtcMs(PREDICTION_START_YEAR, NUM_MONTHS) + 15 * DAY_MS
        : monthStartUtcMs(PREDICTION_START_YEAR, NUM_MONTHS + 1);
    return makeSeriesFromMonthlyVolumes(realization, PREDICTION_START_YEAR, monthlyVolumes, roles, sourceEnd);
}

/**
 * Cumulative series from January of `firstYear`, one boundary per month start. Intervals are source-aligned
 * up to `sourceEndUtcMs`, partial across it and unsupported after it; values are used as given.
 */
export function makeSeriesFromMonthlyVolumes(
    realization: number,
    firstYear: number,
    monthlyVolumes: number[],
    roles: string[],
    sourceEndUtcMs: number,
) {
    const timestampsUtcMs = Array.from({ length: monthlyVolumes.length + 1 }, (_, index) =>
        monthStartUtcMs(firstYear, index + 1),
    );
    const values = [0];
    for (const volume of monthlyVolumes) {
        values.push(values[values.length - 1] + volume);
    }
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
                lastTimestampUtcMs: sourceEndUtcMs,
                sampleCount: timestampsUtcMs.filter((timestamp) => timestamp <= sourceEndUtcMs).length,
                maxSampleGapMs: 31 * DAY_MS,
            })),
            intervals: monthlyVolumes.map((_, index) => {
                const start = timestampsUtcMs[index];
                const end = timestampsUtcMs[index + 1];
                if (start >= sourceEndUtcMs) {
                    return { status: "UNSUPPORTED", supportedStartUtcMs: null, supportedEndUtcMs: null };
                }
                const isPartial = end > sourceEndUtcMs;
                return {
                    status: isPartial ? "PARTIAL" : "SOURCE_ALIGNED",
                    supportedStartUtcMs: start,
                    supportedEndUtcMs: isPartial ? sourceEndUtcMs : end,
                };
            }),
        },
    };
}

// --- B3b scale fixtures: 360 monthly intervals (361 boundaries) from January 2025 through December 2054. ---
export const SCALE_CASE_UUID = "5ca1e000-0000-4000-8000-000000000003";
export const SCALE_ENSEMBLE_NAME = "Scale";
export const SCALE_FIRST_YEAR = 2025;
export const SCALE_MONTH_COUNT = 360;
export const SCALE_LAST_YEAR = SCALE_FIRST_YEAR + SCALE_MONTH_COUNT / 12 - 1;
/** Its oil source ends on 1 January 2050, so its full-horizon oil results are excluded; early results are not. */
export const SCALE_SHORT_OIL_INDEX = 7;
const SCALE_SHORT_OIL_END_MONTH = (2050 - SCALE_FIRST_YEAR) * 12;

/** Increasing, non-contiguous and unevenly spaced: 1, 3, 5, 8, 10, 12, 15, ... */
export function makeScaleRealizationIds(count: number): number[] {
    return Array.from({ length: count }, (_, index) => 1 + 2 * index + Math.floor(index / 3));
}

/** No production in 2025; afterwards a realization-specific plateau declining monthly. */
export function scaleMonthlyOil(realization: number): number[] {
    const plateau = 800 + ((realization * 37) % 400);
    const monthlyDecline = 0.004 + ((realization * 13) % 5) * 0.0005;
    return Array.from({ length: SCALE_MONTH_COUNT }, (_, month) =>
        month < 12 ? 0 : plateau * Math.pow(1 - monthlyDecline, month - 12),
    );
}

export function scaleGasOilRatio(realization: number): number {
    return 90 + (realization % 20);
}

export function scaleMonthlyGas(realization: number): number[] {
    return scaleMonthlyOil(realization).map((volume) => volume * scaleGasOilRatio(realization));
}

/** Signed comparison-minus-reference volumes: every third realization loses production. */
export function scaleDeltaMonthlyOil(realization: number): number[] {
    const sign = realization % 3 === 0 ? -1 : 1;
    return scaleMonthlyOil(realization).map((volume) => sign * 0.25 * volume);
}

export function scaleDeltaMonthlyGas(realization: number): number[] {
    return scaleDeltaMonthlyOil(realization).map((volume) => volume * scaleGasOilRatio(realization));
}

/** Volumes actually served for a realization: the short-oil source holds its value after its support end. */
export function scaleServedMonthlyVolumes(realizations: number[], realization: number, product: "oil" | "gas") {
    const volumes = product === "oil" ? scaleMonthlyOil(realization) : scaleMonthlyGas(realization);
    return product === "oil" && realization === realizations[SCALE_SHORT_OIL_INDEX]
        ? volumes.map((volume, month) => (month < SCALE_SHORT_OIL_END_MONTH ? volume : 0))
        : volumes;
}

/** API-shaped response for one vector of the scale ensemble, in the given realization order. */
export function makeScaleVectorResponse(
    realizations: number[],
    vectorName: "FOPT" | "FGST",
    options: { delta?: boolean; order?: number[] } = {},
) {
    const product = vectorName === "FOPT" ? "oil" : "gas";
    const fullEnd = monthStartUtcMs(SCALE_FIRST_YEAR, SCALE_MONTH_COUNT + 1);
    return (options.order ?? realizations).map((realization) => {
        if (options.delta) {
            const volumes = product === "oil" ? scaleDeltaMonthlyOil(realization) : scaleDeltaMonthlyGas(realization);
            return makeSeriesFromMonthlyVolumes(
                realization,
                SCALE_FIRST_YEAR,
                volumes,
                ["COMPARISON", "REFERENCE"],
                fullEnd,
            );
        }
        const isShort = product === "oil" && realization === realizations[SCALE_SHORT_OIL_INDEX];
        return makeSeriesFromMonthlyVolumes(
            realization,
            SCALE_FIRST_YEAR,
            scaleServedMonthlyVolumes(realizations, realization, product),
            ["REGULAR"],
            isShort ? monthStartUtcMs(SCALE_FIRST_YEAR, SCALE_SHORT_OIL_END_MONTH + 1) : fullEnd,
        );
    });
}

export type ScaleEconomicInputs = {
    predictionStartYear: number;
    discountRatePercent: number;
    oilPrice: number;
    gasPrice: number;
    costs: { year: number; capex: number; opex: number }[];
};

/** CAPEX before first production and OPEX afterwards below the tail revenue, so the regular IRR is finite. */
export const SCALE_BASE_INPUTS: ScaleEconomicInputs = {
    predictionStartYear: SCALE_FIRST_YEAR,
    discountRatePercent: 8,
    oilPrice: 50,
    gasPrice: 0.2,
    costs: [
        { year: SCALE_FIRST_YEAR, capex: 4_000_000, opex: 0 },
        ...Array.from({ length: SCALE_LAST_YEAR - SCALE_FIRST_YEAR }, (_, index) => ({
            year: SCALE_FIRST_YEAR + 1 + index,
            capex: 0,
            opex: 60_000,
        })),
    ],
};

/**
 * Independent reference for the scale fixtures, written from the documented conventions without module code:
 * monthly midpoint revenue and OPEX (annual/12), mid-year CAPEX, valuation on 1 January of the start year.
 */
export function scaleReferenceEconomics(
    monthlyOil: number[],
    monthlyGas: number[],
    inputs: ScaleEconomicInputs,
    earlyEndYear: number | null,
    rateOverride?: number,
) {
    const rate = rateOverride ?? inputs.discountRatePercent / 100;
    const start = inputs.predictionStartYear;
    const discount = (time: number) => Math.pow(1 + rate, -time);
    let npv = 0;
    let earlyDcf = 0;
    let discountedOil = 0;
    let discountedGas = 0;
    let earlyDiscountedOil = 0;
    let presentCosts = 0;
    for (let month = 0; month < SCALE_MONTH_COUNT; month++) {
        const year = SCALE_FIRST_YEAR + Math.floor(month / 12);
        if (year < start) continue;
        const factor = discount(year - start + ((month % 12) + 0.5) / 12);
        const revenue = (inputs.oilPrice * monthlyOil[month] + inputs.gasPrice * monthlyGas[month]) * factor;
        npv += revenue;
        discountedOil += monthlyOil[month] * factor;
        discountedGas += monthlyGas[month] * factor;
        if (earlyEndYear !== null && year <= earlyEndYear) {
            earlyDcf += revenue;
            earlyDiscountedOil += monthlyOil[month] * factor;
        }
    }
    for (const cost of inputs.costs) {
        if (cost.year < start || cost.year > SCALE_LAST_YEAR) continue;
        let presentCost = cost.capex * discount(cost.year - start + 0.5);
        for (let month = 1; month <= 12; month++) {
            presentCost += (cost.opex / 12) * discount(cost.year - start + (month - 0.5) / 12);
        }
        npv -= presentCost;
        presentCosts += presentCost;
        if (earlyEndYear !== null && cost.year <= earlyEndYear) earlyDcf -= presentCost;
    }
    const breakEvenOilPrice = (presentCosts - inputs.gasPrice * discountedGas) / discountedOil;
    return { npv, earlyDcf, discountedOil, earlyDiscountedOil, breakEvenOilPrice };
}

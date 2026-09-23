import {
    BreakEvenSlopeDirection,
    type CostProfileEntry,
    type IrrStatus,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    BREAK_EVEN_OIL_VOLUME_TOLERANCE,
    computeInternalRateOfReturnFromEvents,
    makeCostLookup,
    type IrrComputationResult,
    type TimedCashFlowEvent,
} from "./economicCalculations";
import {
    isMonthCoverageEstablished,
    monthIndexOf,
    type MonthlyProductionProfile,
    type MonthlyVolumeSample,
} from "./monthlyProduction";

const VOLUME_TOLERANCE = 1e-12;

/** Economic assumptions rescaled to the volume units of the source vectors. */
export type ResolvedMonthlyAssumptions = {
    discountRateFraction: number;
    /** Valuation and evaluation both start on 1 January of this year. */
    predictionStartYear: number;
    /**
     * Last evaluated calendar month as an absolute month index, from the full-ensemble source envelope.
     * Every realization is validated against this common horizon rather than its own endpoint.
     */
    horizonEndMonthIndex: number;
    /** Divisor turning a raw gas volume into an oil equivalent in the oil vector's unit. */
    gasToOilEquivalentDivisor: number;
    /** Null means unspecified. Zero intentionally omits the product's revenue. */
    oilPricePerVolume: number | null;
    gasPricePerVolume: number | null;
    /** Inclusive end year of the separate early outputs; null when early outputs are not requested. */
    earlyEndYear?: number | null;
};

export type MonthlyRealizationInput = {
    realization: number;
    /** Null when the product has no source data for this realization. */
    oilProfile: MonthlyProductionProfile | null;
    salesGasProfile: MonthlyProductionProfile | null;
};

export type AnnualEconomicProfileEntry = {
    year: number;
    oilVolume: number;
    salesGasVolume: number;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    capex: number;
    /** The entered annual amount; it is paid as twelve equal monthly-midpoint allocations. */
    opex: number;
    /** Undiscounted revenue minus costs. Null when full-horizon financial results are unavailable. */
    netCashFlow: number | null;
    /** Monthly-discounted revenue and OPEX minus mid-year-discounted CAPEX. */
    discountedNetCashFlow: number | null;
    cumulativeDiscountedCashFlow: number | null;
};

/** Early outputs, validated on their own inclusive horizon from the same valuation date. */
export type EarlyMonthlyValueResult = {
    endYear: number;
    hasOilData: boolean;
    hasSalesGasData: boolean;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    discountedOilEquivalents: number;
    npv: number | null;
};

export type MonthlyRealizationEconomicResult = {
    realization: number;
    predictionStartYear: number;
    /** Last calendar year of the common evaluation horizon. */
    evaluationEndYear: number;
    annualProfile: AnnualEconomicProfileEntry[];
    /** True only when source coverage is established for every month of the full horizon. */
    hasOilData: boolean;
    hasSalesGasData: boolean;
    gasToOilEquivalentDivisor: number;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    discountedOilEquivalents: number;
    undiscountedOilVolume: number;
    undiscountedSalesGasVolume: number;
    npv: number | null;
    financialReason?: string;
    irr: number | null;
    irrStatus?: IrrStatus;
    breakEvenOilPrice: number | null;
    breakEvenSlopeDirection?: BreakEvenSlopeDirection;
    /** Years of non-zero cost entries outside the evaluated horizon, which are kept out of every total. */
    excludedCostYears: number[];
    early: EarlyMonthlyValueResult | null;
};

/** Discount factor for a volume produced during a calendar month, timed at the month's midpoint. */
export function monthlyDiscountFactor(
    year: number,
    month: number,
    predictionStartYear: number,
    discountRateFraction: number,
): number {
    const time = year - predictionStartYear + (month - 0.5) / 12;
    return Math.pow(1 + discountRateFraction, -time);
}

/** Discount factor for annual CAPEX, timed at mid-year. */
export function capexDiscountFactor(year: number, predictionStartYear: number, discountRateFraction: number): number {
    return Math.pow(1 + discountRateFraction, -(year - predictionStartYear + 0.5));
}

/**
 * Present value of one year's OPEX, paid as twelve equal allocations at the month midpoints. The full
 * annual amount is always allocated to all twelve months, independent of production in that year.
 */
export function discountedAnnualOpex(
    annualOpex: number,
    year: number,
    predictionStartYear: number,
    discountRateFraction: number,
): number {
    let factorSum = 0;
    for (let month = 1; month <= 12; month++) {
        factorSum += monthlyDiscountFactor(year, month, predictionStartYear, discountRateFraction);
    }
    return (annualOpex / 12) * factorSum;
}

type EvaluatedProduct = {
    monthByIndex: Map<number, MonthlyVolumeSample>;
    /** Last month index such that every month from the horizon start through it is present and established. */
    establishedThroughMonthIndex: number;
};

function evaluateProduct(
    profile: MonthlyProductionProfile | null,
    startMonthIndex: number,
    endMonthIndex: number,
): EvaluatedProduct {
    const monthByIndex = new Map<number, MonthlyVolumeSample>();
    if (profile !== null && profile.rejection === null) {
        for (const monthSample of profile.months) {
            const monthIndex = monthIndexOf(monthSample.year, monthSample.month);
            if (monthIndex >= startMonthIndex && monthIndex <= endMonthIndex) {
                monthByIndex.set(monthIndex, monthSample);
            }
        }
    }

    // No zero production is inferred for months the source does not cover, including pre-source months.
    let monthIndex = startMonthIndex;
    while (monthIndex <= endMonthIndex) {
        const monthSample = monthByIndex.get(monthIndex);
        if (!monthSample || !isMonthCoverageEstablished(monthSample.coverage)) {
            break;
        }
        monthIndex++;
    }

    return { monthByIndex, establishedThroughMonthIndex: monthIndex - 1 };
}

function isEstablishedThrough(product: EvaluatedProduct, endMonthIndex: number): boolean {
    return product.establishedThroughMonthIndex >= endMonthIndex;
}

/** Every month must be zero on its own; positive and negative signed delta months must not cancel. */
function isConfirmedAbsentThrough(product: EvaluatedProduct, startMonthIndex: number, endMonthIndex: number): boolean {
    if (!isEstablishedThrough(product, endMonthIndex)) {
        return false;
    }
    for (let monthIndex = startMonthIndex; monthIndex <= endMonthIndex; monthIndex++) {
        if (Math.abs(product.monthByIndex.get(monthIndex)!.volume) >= VOLUME_TOLERANCE) {
            return false;
        }
    }
    return true;
}

/** A zero price omits the revenue; otherwise the product needs established data and a price unless absent. */
function isRevenueResolved(price: number | null, isDataEstablished: boolean, isConfirmedAbsent: boolean): boolean {
    return price === 0 || (isDataEstablished && (price !== null || isConfirmedAbsent));
}

function revenueReason(
    productLabel: string,
    price: number | null,
    isDataEstablished: boolean,
    isConfirmedAbsent: boolean,
): string | undefined {
    if (price === 0) {
        return undefined;
    }
    if (!isDataEstablished) {
        return `${productLabel} source coverage is not established for every month of the evaluation.`;
    }
    if (price === null && !isConfirmedAbsent) {
        return `Enter ${productLabel.toLowerCase()} price.`;
    }
    return undefined;
}

type AnnualComponents = {
    year: number;
    months: { oil: MonthlyVolumeSample[]; gas: MonthlyVolumeSample[] };
    oilVolume: number;
    salesGasVolume: number;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    capex: number;
    opex: number;
    discountedCosts: number;
};

function monthsOfYear(product: EvaluatedProduct, year: number): MonthlyVolumeSample[] {
    const months: MonthlyVolumeSample[] = [];
    for (let month = 1; month <= 12; month++) {
        const monthSample = product.monthByIndex.get(monthIndexOf(year, month));
        if (monthSample) {
            months.push(monthSample);
        }
    }
    return months;
}

function sumVolumes(months: MonthlyVolumeSample[]): number {
    return months.reduce((sum, monthSample) => sum + monthSample.volume, 0);
}

function sumDiscountedVolumes(
    months: MonthlyVolumeSample[],
    predictionStartYear: number,
    discountRateFraction: number,
): number {
    return months.reduce(
        (sum, monthSample) =>
            sum +
            monthSample.volume *
                monthlyDiscountFactor(monthSample.year, monthSample.month, predictionStartYear, discountRateFraction),
        0,
    );
}

function discountedNetCashFlowOf(entry: AnnualComponents, oilPrice: number, gasPrice: number): number {
    return oilPrice * entry.discountedOilVolume + gasPrice * entry.discountedSalesGasVolume - entry.discountedCosts;
}

/** Undiscounted events: monthly revenue minus monthly OPEX at each month midpoint, and CAPEX at mid-year. */
function makeCashFlowEvents(
    annualComponents: AnnualComponents[],
    predictionStartYear: number,
    oilPrice: number,
    gasPrice: number,
): TimedCashFlowEvent[] {
    const events: TimedCashFlowEvent[] = [];
    for (const entry of annualComponents) {
        const revenueByMonth = new Array<number>(12).fill(0);
        for (const monthSample of entry.months.oil) {
            revenueByMonth[monthSample.month - 1] += oilPrice * monthSample.volume;
        }
        for (const monthSample of entry.months.gas) {
            revenueByMonth[monthSample.month - 1] += gasPrice * monthSample.volume;
        }
        const yearOffset = entry.year - predictionStartYear;
        revenueByMonth.forEach((revenue, index) => {
            events.push({ time: yearOffset + (index + 0.5) / 12, value: revenue - entry.opex / 12 });
        });
        events.push({ time: yearOffset + 0.5, value: -entry.capex });
    }
    return events;
}

/**
 * Screening economics for a single realization over the common evaluation horizon: production,
 * revenue and one twelfth of each year's OPEX at monthly midpoints, and annual CAPEX at mid-year.
 */
export function computeMonthlyRealizationEconomics(
    input: MonthlyRealizationInput,
    assumptions: ResolvedMonthlyAssumptions,
    costProfile: CostProfileEntry[],
): MonthlyRealizationEconomicResult {
    const { predictionStartYear, discountRateFraction, horizonEndMonthIndex } = assumptions;
    const startMonthIndex = monthIndexOf(predictionStartYear, 1);
    const evaluationEndYear = Math.floor(horizonEndMonthIndex / 12);
    const costLookup = makeCostLookup(costProfile);
    const oil = evaluateProduct(input.oilProfile, startMonthIndex, horizonEndMonthIndex);
    const gas = evaluateProduct(input.salesGasProfile, startMonthIndex, horizonEndMonthIndex);

    const years: number[] = [];
    for (let year = predictionStartYear; year <= evaluationEndYear; year++) {
        years.push(year);
    }
    const excludedCostYears = costProfile
        .filter((entry) => entry.capex !== 0 || entry.opex !== 0)
        .map((entry) => entry.year)
        .filter((year) => year < predictionStartYear || year > evaluationEndYear)
        .sort((first, second) => first - second);

    const annualComponents: AnnualComponents[] = years.map((year) => {
        const oilMonths = monthsOfYear(oil, year);
        const gasMonths = monthsOfYear(gas, year);
        const capex = costLookup.get(year)?.capex ?? 0;
        const opex = costLookup.get(year)?.opex ?? 0;
        return {
            year,
            months: { oil: oilMonths, gas: gasMonths },
            oilVolume: sumVolumes(oilMonths),
            salesGasVolume: sumVolumes(gasMonths),
            discountedOilVolume: sumDiscountedVolumes(oilMonths, predictionStartYear, discountRateFraction),
            discountedSalesGasVolume: sumDiscountedVolumes(gasMonths, predictionStartYear, discountRateFraction),
            capex,
            opex,
            discountedCosts:
                capex * capexDiscountFactor(year, predictionStartYear, discountRateFraction) +
                discountedAnnualOpex(opex, year, predictionStartYear, discountRateFraction),
        };
    });

    const hasOilData = isEstablishedThrough(oil, horizonEndMonthIndex);
    const hasSalesGasData = isEstablishedThrough(gas, horizonEndMonthIndex);
    const isOilAbsent = isConfirmedAbsentThrough(oil, startMonthIndex, horizonEndMonthIndex);
    const isGasAbsent = isConfirmedAbsentThrough(gas, startMonthIndex, horizonEndMonthIndex);
    const { oilPricePerVolume, gasPricePerVolume } = assumptions;
    const effectiveOilPrice = oilPricePerVolume ?? 0;
    const effectiveGasPrice = gasPricePerVolume ?? 0;

    const isGasRevenueResolved = isRevenueResolved(gasPricePerVolume, hasSalesGasData, isGasAbsent);
    const canComputeFinancialNpv =
        years.length > 0 && isRevenueResolved(oilPricePerVolume, hasOilData, isOilAbsent) && isGasRevenueResolved;
    const financialReason =
        revenueReason("Oil", oilPricePerVolume, hasOilData, isOilAbsent) ??
        revenueReason("Gas", gasPricePerVolume, hasSalesGasData, isGasAbsent);

    let npv: number | null = null;
    let irrResult: IrrComputationResult | null = null;
    let runningCumulative = 0;
    const annualProfile: AnnualEconomicProfileEntry[] = annualComponents.map((entry) => {
        const profileEntry = {
            year: entry.year,
            oilVolume: entry.oilVolume,
            salesGasVolume: entry.salesGasVolume,
            discountedOilVolume: entry.discountedOilVolume,
            discountedSalesGasVolume: entry.discountedSalesGasVolume,
            capex: entry.capex,
            opex: entry.opex,
        };
        if (!canComputeFinancialNpv) {
            return {
                ...profileEntry,
                netCashFlow: null,
                discountedNetCashFlow: null,
                cumulativeDiscountedCashFlow: null,
            };
        }
        const discountedNetCashFlow = discountedNetCashFlowOf(entry, effectiveOilPrice, effectiveGasPrice);
        runningCumulative += discountedNetCashFlow;
        return {
            ...profileEntry,
            netCashFlow:
                effectiveOilPrice * entry.oilVolume +
                effectiveGasPrice * entry.salesGasVolume -
                entry.capex -
                entry.opex,
            discountedNetCashFlow,
            cumulativeDiscountedCashFlow: runningCumulative,
        };
    });

    if (canComputeFinancialNpv) {
        npv = runningCumulative;
        // Sign changes are classified on these exact events, combined only where times coincide.
        irrResult = computeInternalRateOfReturnFromEvents(
            makeCashFlowEvents(annualComponents, predictionStartYear, effectiveOilPrice, effectiveGasPrice),
        );
    }

    const discountedOilVolume = annualComponents.reduce((sum, entry) => sum + entry.discountedOilVolume, 0);
    const discountedSalesGasVolume = annualComponents.reduce((sum, entry) => sum + entry.discountedSalesGasVolume, 0);
    const pvCosts = annualComponents.reduce((sum, entry) => sum + entry.discountedCosts, 0);
    const hasAnyCostEntry = annualComponents.some((entry) => entry.capex !== 0 || entry.opex !== 0);

    let breakEvenOilPrice: number | null = null;
    let breakEvenSlopeDirection: BreakEvenSlopeDirection | undefined = undefined;
    if (
        hasOilData &&
        isGasRevenueResolved &&
        hasAnyCostEntry &&
        Math.abs(discountedOilVolume) > BREAK_EVEN_OIL_VOLUME_TOLERANCE
    ) {
        breakEvenOilPrice = (pvCosts - effectiveGasPrice * discountedSalesGasVolume) / discountedOilVolume;
        breakEvenSlopeDirection =
            discountedOilVolume > 0 ? BreakEvenSlopeDirection.POSITIVE : BreakEvenSlopeDirection.NEGATIVE;
    }

    return {
        realization: input.realization,
        predictionStartYear,
        evaluationEndYear,
        annualProfile,
        hasOilData,
        hasSalesGasData,
        gasToOilEquivalentDivisor: assumptions.gasToOilEquivalentDivisor,
        discountedOilVolume,
        discountedSalesGasVolume,
        discountedOilEquivalents:
            discountedOilVolume + discountedSalesGasVolume / assumptions.gasToOilEquivalentDivisor,
        undiscountedOilVolume: annualComponents.reduce((sum, entry) => sum + entry.oilVolume, 0),
        undiscountedSalesGasVolume: annualComponents.reduce((sum, entry) => sum + entry.salesGasVolume, 0),
        npv,
        financialReason,
        irr: irrResult?.irr ?? null,
        irrStatus: irrResult?.status,
        breakEvenOilPrice,
        breakEvenSlopeDirection,
        excludedCostYears,
        early: computeEarlyValue(annualComponents, oil, gas, assumptions, startMonthIndex),
    };
}

/**
 * Cumulative discounted values through an inclusive calendar year, from the same valuation date as the
 * full evaluation. Validity is established on this shorter horizon alone, so an incomplete later
 * month does not remove valid early values, and the full results are never shortened.
 */
function computeEarlyValue(
    annualComponents: AnnualComponents[],
    oil: EvaluatedProduct,
    gas: EvaluatedProduct,
    assumptions: ResolvedMonthlyAssumptions,
    startMonthIndex: number,
): EarlyMonthlyValueResult | null {
    const endYear = assumptions.earlyEndYear;
    if (
        endYear === null ||
        endYear === undefined ||
        endYear < assumptions.predictionStartYear ||
        monthIndexOf(endYear, 1) > assumptions.horizonEndMonthIndex
    ) {
        return null;
    }
    const earlyEndMonthIndex = Math.min(monthIndexOf(endYear, 12), assumptions.horizonEndMonthIndex);
    const includedYears = annualComponents.filter((entry) => entry.year <= endYear);

    const hasOilData = isEstablishedThrough(oil, earlyEndMonthIndex);
    const hasSalesGasData = isEstablishedThrough(gas, earlyEndMonthIndex);
    const canComputeNpv =
        isRevenueResolved(
            assumptions.oilPricePerVolume,
            hasOilData,
            isConfirmedAbsentThrough(oil, startMonthIndex, earlyEndMonthIndex),
        ) &&
        isRevenueResolved(
            assumptions.gasPricePerVolume,
            hasSalesGasData,
            isConfirmedAbsentThrough(gas, startMonthIndex, earlyEndMonthIndex),
        );
    const oilPrice = assumptions.oilPricePerVolume ?? 0;
    const gasPrice = assumptions.gasPricePerVolume ?? 0;
    const discountedOilVolume = includedYears.reduce((sum, entry) => sum + entry.discountedOilVolume, 0);
    const discountedSalesGasVolume = includedYears.reduce((sum, entry) => sum + entry.discountedSalesGasVolume, 0);

    return {
        endYear,
        hasOilData,
        hasSalesGasData,
        discountedOilVolume,
        discountedSalesGasVolume,
        discountedOilEquivalents:
            discountedOilVolume + discountedSalesGasVolume / assumptions.gasToOilEquivalentDivisor,
        npv: canComputeNpv
            ? includedYears.reduce((sum, entry) => sum + discountedNetCashFlowOf(entry, oilPrice, gasPrice), 0)
            : null,
    };
}

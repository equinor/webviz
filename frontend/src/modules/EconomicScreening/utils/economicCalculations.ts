import type { CostProfileEntry, EvaluationWindow } from "@modules/EconomicScreening/typesAndEnums";
import { DiscountConvention, InvestmentTiming } from "@modules/EconomicScreening/typesAndEnums";

const IRR_LOWER_BOUND = -0.9999;
const IRR_UPPER_BOUND = 10;
const IRR_MAX_ITERATIONS = 200;
const IRR_TOLERANCE = 1e-9;

/** Economic assumptions rescaled to the volume units of the source vectors. */
export type ResolvedEconomicAssumptions = {
    discountRateFraction: number;
    /** Null means "use the first year of the aligned profile". */
    baseYear: number | null;
    convention: DiscountConvention;
    investmentTiming: InvestmentTiming;
    /** Divisor turning a raw gas volume into an oil equivalent in the oil vector's unit. */
    gasToOilEquivalentDivisor: number;
    oilPricePerVolume: number | null;
    gasPricePerVolume: number | null;
};

export type AnnualVolumeProfile = {
    /** Calendar year at the start of each annual interval. */
    years: number[];
    /** Volume produced during the year, in the unit of the source vector. */
    volumes: number[];
};

export type RealizationEconomicInput = {
    realization: number;
    years: number[];
    oilVolumes: number[];
    salesGasVolumes: number[];
};

export type RealizationEconomicResult = {
    realization: number;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    discountedOilEquivalents: number;
    undiscountedOilVolume: number;
    undiscountedSalesGasVolume: number;
    npv: number | null;
    irr: number | null;
    breakEvenOilPrice: number | null;
    /** Net cash flow per year, aligned with `years`. Null when prices are not given. */
    netCashFlow: number[] | null;
    years: number[];
    discountFactors: number[];
};

/**
 * Converts a cumulative vector sampled at yearly timestamps into produced volume per year.
 *
 * The backend yearly resampling returns January 1st samples spanning the full data range, so
 * N samples yield N-1 complete calendar-year intervals.
 */
export function computeAnnualVolumesFromCumulative(
    timestampsUtcMs: number[],
    cumulativeValues: number[],
): AnnualVolumeProfile {
    if (timestampsUtcMs.length !== cumulativeValues.length) {
        throw new Error("Timestamp and value arrays must have equal length");
    }

    const years: number[] = [];
    const volumes: number[] = [];
    for (let i = 0; i < timestampsUtcMs.length - 1; i++) {
        years.push(new Date(timestampsUtcMs[i]).getUTCFullYear());
        volumes.push(cumulativeValues[i + 1] - cumulativeValues[i]);
    }

    return { years, volumes };
}

export function makeDiscountFactors(
    years: number[],
    discountRateFraction: number,
    baseYear: number,
    convention: DiscountConvention,
): number[] {
    const offset = convention === DiscountConvention.MID_YEAR ? 0.5 : 1.0;
    return years.map((year) => 1 / Math.pow(1 + discountRateFraction, year - baseYear + offset));
}

function makeInvestmentDiscountFactors(
    years: number[],
    discountRateFraction: number,
    baseYear: number,
    convention: DiscountConvention,
    investmentTiming: InvestmentTiming,
): number[] {
    if (investmentTiming === InvestmentTiming.FOLLOW_ANNUAL_TIMING) {
        return makeDiscountFactors(years, discountRateFraction, baseYear, convention);
    }
    return years.map((year) => 1 / Math.pow(1 + discountRateFraction, year - baseYear));
}

export function sumDiscounted(values: number[], discountFactors: number[]): number {
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i] * discountFactors[i];
    }
    return sum;
}

function sumOf(values: number[]): number {
    return values.reduce((acc, value) => acc + value, 0);
}

export function makeCostLookup(costProfile: CostProfileEntry[]): Map<number, { capex: number; opex: number }> {
    const lookup = new Map<number, { capex: number; opex: number }>();
    for (const entry of costProfile) {
        const existing = lookup.get(entry.year);
        if (existing) {
            existing.capex += entry.capex;
            existing.opex += entry.opex;
        } else {
            lookup.set(entry.year, { capex: entry.capex, opex: entry.opex });
        }
    }
    return lookup;
}

/**
 * Restricts the profile to the evaluation window and adds any cost-only years that fall inside it,
 * so that up-front CAPEX before first production is not silently dropped.
 */
export function alignProfileWithCosts(
    input: RealizationEconomicInput,
    costLookup: Map<number, { capex: number; opex: number }>,
    evaluationWindow: EvaluationWindow,
): RealizationEconomicInput {
    const yearSet = new Set<number>(input.years);
    for (const year of costLookup.keys()) {
        yearSet.add(year);
    }

    const volumeByYear = new Map<number, { oil: number; gas: number }>();
    for (let i = 0; i < input.years.length; i++) {
        volumeByYear.set(input.years[i], { oil: input.oilVolumes[i], gas: input.salesGasVolumes[i] });
    }

    const sortedYears = Array.from(yearSet)
        .filter((year) => evaluationWindow.firstYear === null || year >= evaluationWindow.firstYear)
        .filter((year) => evaluationWindow.lastYear === null || year <= evaluationWindow.lastYear)
        .sort((a, b) => a - b);

    return {
        realization: input.realization,
        years: sortedYears,
        oilVolumes: sortedYears.map((year) => volumeByYear.get(year)?.oil ?? 0),
        salesGasVolumes: sortedYears.map((year) => volumeByYear.get(year)?.gas ?? 0),
    };
}

/**
 * Finds the discount rate where the net present value of the cash flow is zero.
 *
 * Returns null when the cash flow does not change sign, i.e. when no internal rate of return exists.
 */
export function computeInternalRateOfReturn(
    years: number[],
    netCashFlow: number[],
    baseYear: number,
    convention: DiscountConvention,
): number | null {
    const offset = convention === DiscountConvention.MID_YEAR ? 0.5 : 1;
    return computeConventionalInternalRateOfReturn(
        years.map((year) => year - baseYear + offset),
        netCashFlow,
    );
}

function computeConventionalInternalRateOfReturn(eventTimes: number[], cashFlows: number[]): number | null {
    const eventsByTime = new Map<number, number>();
    for (let i = 0; i < eventTimes.length; i++) {
        eventsByTime.set(eventTimes[i], (eventsByTime.get(eventTimes[i]) ?? 0) + cashFlows[i]);
    }

    const events = Array.from(eventsByTime.entries())
        .sort(([firstTime], [secondTime]) => firstTime - secondTime)
        .map(([time, cashFlow]) => ({ time, cashFlow }))
        .filter((event) => event.cashFlow !== 0);
    if (events.length < 2 || events[0].cashFlow >= 0 || events.slice(1).some((event) => event.cashFlow <= 0)) {
        return null;
    }

    const npvAtRate = (rate: number): number =>
        events.reduce((sum, event) => sum + event.cashFlow / Math.pow(1 + rate, event.time), 0);

    let low = IRR_LOWER_BOUND;
    let high = IRR_UPPER_BOUND;
    let npvLow = npvAtRate(low);
    let npvHigh = npvAtRate(high);

    if (!Number.isFinite(npvLow) || !Number.isFinite(npvHigh)) {
        return null;
    }
    if (npvLow === 0) return low;
    if (npvHigh === 0) return high;
    if (npvLow * npvHigh > 0) {
        return null;
    }

    for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        const npvMid = npvAtRate(mid);
        if (!Number.isFinite(npvMid)) {
            return null;
        }
        if (Math.abs(npvMid) < IRR_TOLERANCE || high - low < IRR_TOLERANCE) {
            return mid;
        }
        if (npvLow * npvMid < 0) {
            high = mid;
            npvHigh = npvMid;
        } else {
            low = mid;
            npvLow = npvMid;
        }
    }

    return (low + high) / 2;
}

export function computeRealizationEconomics(
    input: RealizationEconomicInput,
    assumptions: ResolvedEconomicAssumptions,
    costProfile: CostProfileEntry[],
    evaluationWindow: EvaluationWindow,
): RealizationEconomicResult {
    const costLookup = makeCostLookup(costProfile);
    const alignedInput = alignProfileWithCosts(input, costLookup, evaluationWindow);
    const { years, oilVolumes, salesGasVolumes } = alignedInput;

    const baseYear = assumptions.baseYear ?? years[0] ?? 0;
    const discountFactors = makeDiscountFactors(
        years,
        assumptions.discountRateFraction,
        baseYear,
        assumptions.convention,
    );
    const investmentDiscountFactors = makeInvestmentDiscountFactors(
        years,
        assumptions.discountRateFraction,
        baseYear,
        assumptions.convention,
        assumptions.investmentTiming,
    );

    const discountedOilVolume = sumDiscounted(oilVolumes, discountFactors);
    const discountedSalesGasVolume = sumDiscounted(salesGasVolumes, discountFactors);
    const discountedOilEquivalents =
        discountedOilVolume + discountedSalesGasVolume / assumptions.gasToOilEquivalentDivisor;

    const capexPerYear = years.map((year) => costLookup.get(year)?.capex ?? 0);
    const opexPerYear = years.map((year) => costLookup.get(year)?.opex ?? 0);
    const discountedCosts =
        sumDiscounted(capexPerYear, investmentDiscountFactors) + sumDiscounted(opexPerYear, discountFactors);

    const hasPrices = assumptions.oilPricePerVolume !== null || assumptions.gasPricePerVolume !== null;
    let netCashFlow: number[] | null = null;
    let npv: number | null = null;
    let irr: number | null = null;
    if (hasPrices) {
        const oilPrice = assumptions.oilPricePerVolume ?? 0;
        const gasPrice = assumptions.gasPricePerVolume ?? 0;
        netCashFlow = years.map(
            (_, i) => oilPrice * oilVolumes[i] + gasPrice * salesGasVolumes[i] - capexPerYear[i] - opexPerYear[i],
        );
        npv =
            sumDiscounted(
                years.map((_, i) => oilPrice * oilVolumes[i] + gasPrice * salesGasVolumes[i] - opexPerYear[i]),
                discountFactors,
            ) - sumDiscounted(capexPerYear, investmentDiscountFactors);
        const annualOffset = assumptions.convention === DiscountConvention.MID_YEAR ? 0.5 : 1;
        const investmentOffset = assumptions.investmentTiming === InvestmentTiming.START_OF_YEAR ? 0 : annualOffset;
        irr = computeConventionalInternalRateOfReturn(
            years.flatMap((year) => [year - baseYear + annualOffset, year - baseYear + investmentOffset]),
            years.flatMap((_, i) => [
                oilPrice * oilVolumes[i] + gasPrice * salesGasVolumes[i] - opexPerYear[i],
                -capexPerYear[i],
            ]),
        );
    }

    // Gas revenue is held fixed while solving the oil price that makes NPV zero.
    const hasCosts = capexPerYear.some((cost) => cost !== 0) || opexPerYear.some((cost) => cost !== 0);
    const breakEvenOilPrice =
        hasCosts &&
        Math.abs(discountedOilVolume) > Number.EPSILON &&
        (discountedSalesGasVolume === 0 || assumptions.gasPricePerVolume !== null)
            ? (discountedCosts - (assumptions.gasPricePerVolume ?? 0) * discountedSalesGasVolume) / discountedOilVolume
            : null;

    return {
        realization: alignedInput.realization,
        discountedOilVolume,
        discountedSalesGasVolume,
        discountedOilEquivalents,
        undiscountedOilVolume: sumOf(oilVolumes),
        undiscountedSalesGasVolume: sumOf(salesGasVolumes),
        npv,
        irr,
        breakEvenOilPrice,
        netCashFlow,
        years,
        discountFactors,
    };
}

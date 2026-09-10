import type { CostProfileEntry, EvaluationWindow } from "@modules/EconomicScreening/typesAndEnums";
import {
    BreakEvenSlopeDirection,
    DiscountConvention,
    InvestmentTiming,
    IrrStatus,
} from "@modules/EconomicScreening/typesAndEnums";

export const IRR_LOWER_BOUND = -0.9999;
export const IRR_UPPER_BOUND = 10;
export const IRR_MAX_ITERATIONS = 200;
export const IRR_TOLERANCE = 1e-9;
export const BREAK_EVEN_OIL_VOLUME_TOLERANCE = 1e-9;

/** Economic assumptions rescaled to the volume units of the source vectors. */
export type ResolvedEconomicAssumptions = {
    discountRateFraction: number;
    /** Null means "use the first year of the aligned profile". */
    baseYear: number | null;
    convention: DiscountConvention;
    investmentTiming?: InvestmentTiming;
    /** Divisor turning a raw gas volume into an oil equivalent in the oil vector's unit. */
    gasToOilEquivalentDivisor: number;
    oilPricePerVolume: number | null;
    gasPricePerVolume: number | null;
    excludeOilRevenue?: boolean;
    excludeGasRevenue?: boolean;
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
    /** False when oil data is absent or incomplete for this realization. */
    hasOilData?: boolean;
    /** False when sales-gas data is absent or incomplete for this realization. */
    hasSalesGasData?: boolean;
};

export type RealizationEconomicResult = {
    realization: number;
    oilVolumes: number[];
    salesGasVolumes: number[];
    hasOilData: boolean;
    hasSalesGasData: boolean;
    gasToOilEquivalentDivisor: number;
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    discountedOilEquivalents: number;
    undiscountedOilVolume: number;
    undiscountedSalesGasVolume: number;
    npv: number | null;
    irr: number | null;
    irrStatus?: IrrStatus;
    breakEvenOilPrice: number | null;
    breakEvenSlopeDirection?: BreakEvenSlopeDirection;
    /** Net cash flow per year, aligned with `years`. Null when prices are not given. */
    netCashFlow: number[] | null;
    /** Discounted net cash flow per year (including separately timed CAPEX). */
    discountedNetCashFlow?: number[] | null;
    /** Cumulative discounted net cash flow per year. */
    cumulativeDiscountedCashFlow?: number[] | null;
    years: number[];
    discountFactors: number[];
    investmentDiscountFactors?: number[];
};

export type EarlyValueResult = {
    discountedOilVolume: number;
    discountedSalesGasVolume: number;
    discountedOilEquivalents: number;
    npv: number | null;
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

    if (timestampsUtcMs.length < 2) {
        return { years: [], volumes: [] };
    }

    // Filter and sort points by timestamp, ensuring finite values and removing non-strictly-increasing timestamps
    const points: { t: number; v: number }[] = [];
    for (let i = 0; i < timestampsUtcMs.length; i++) {
        const t = timestampsUtcMs[i];
        const v = cumulativeValues[i];
        if (!Number.isFinite(t) || !Number.isFinite(v)) {
            continue;
        }
        points.push({ t, v });
    }

    points.sort((a, b) => a.t - b.t);

    const years: number[] = [];
    const volumes: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const t0 = points[i].t;
        const t1 = points[i + 1].t;
        // Avoid duplicate timestamps
        if (t1 <= t0) {
            continue;
        }
        years.push(new Date(t0).getUTCFullYear());
        volumes.push(points[i + 1].v - points[i].v);
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

export function makeInvestmentDiscountFactors(
    years: number[],
    discountRateFraction: number,
    baseYear: number,
    convention: DiscountConvention,
    investmentTiming: InvestmentTiming = InvestmentTiming.START_OF_YEAR,
): number[] {
    const offset =
        investmentTiming === InvestmentTiming.START_OF_YEAR
            ? 0.0
            : convention === DiscountConvention.MID_YEAR
              ? 0.5
              : 1.0;
    return years.map((year) => 1 / Math.pow(1 + discountRateFraction, year - baseYear + offset));
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
        if (lookup.has(entry.year)) {
            throw new Error(`Duplicate cost year: ${entry.year}`);
        }
        lookup.set(entry.year, { capex: entry.capex, opex: entry.opex });
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
 * Checks if a cash flow profile is conventional (initial negative cash flows followed by positive cash flows).
 * In a conventional profile:
 * - Net cash flow starts with one or more negative events (ignoring any leading zeros).
 * - Switches exactly once to positive events.
 * - After the first positive event, no further negative events occur.
 */
export function isConventionalCashFlow(netEvents: number[]): boolean {
    const nonZero = netEvents.filter((val) => Math.abs(val) > 1e-12);
    if (nonZero.length < 2) {
        return false;
    }
    // Must start negative
    if (nonZero[0] > 0) {
        return false;
    }
    let signChanges = 0;
    for (let i = 1; i < nonZero.length; i++) {
        if ((nonZero[i] > 0 && nonZero[i - 1] < 0) || (nonZero[i] < 0 && nonZero[i - 1] > 0)) {
            signChanges++;
        }
    }
    return signChanges === 1;
}

export type IrrComputationResult = {
    irr: number | null;
    status: IrrStatus;
};

/**
 * Finds the discount rate where the net present value of the cash flow is zero.
 *
 * Supports timed cash-flow events, accounting for separate investment timing and operating/revenue timing.
 * Conventional profiles are solved using a bracketed bisection solver.
 */
export function computeInternalRateOfReturnDetailed(
    years: number[],
    revenueMinusOpex: number[],
    capex: number[],
    baseYear: number,
    convention: DiscountConvention,
    investmentTiming: InvestmentTiming = InvestmentTiming.START_OF_YEAR,
): IrrComputationResult {
    // Check if there are any non-zero events
    const hasAnnualTiming = investmentTiming === InvestmentTiming.FOLLOW_ANNUAL_TIMING;
    const combinedEvents: number[] = [];
    if (hasAnnualTiming) {
        for (let i = 0; i < years.length; i++) {
            combinedEvents.push(revenueMinusOpex[i] - capex[i]);
        }
    } else {
        // Events are at distinct times: capex at start-of-year (offset 0), revenue/opex at mid/year-end.
        // For assessing conventional profile order chronologically:
        // For each year: capex event first (-capex), then rev-opex event (+rev-opex).
        for (let i = 0; i < years.length; i++) {
            if (Math.abs(capex[i]) > 1e-12) {
                combinedEvents.push(-capex[i]);
            }
            if (Math.abs(revenueMinusOpex[i]) > 1e-12) {
                combinedEvents.push(revenueMinusOpex[i]);
            }
        }
    }

    const hasPositive = combinedEvents.some((v) => v > 1e-12);
    const hasNegative = combinedEvents.some((v) => v < -1e-12);

    if (!hasPositive || !hasNegative) {
        return { irr: null, status: IrrStatus.NO_FINITE_ROOT };
    }

    if (!isConventionalCashFlow(combinedEvents)) {
        return { irr: null, status: IrrStatus.NON_CONVENTIONAL };
    }

    const npvAtRate = (rate: number): number => {
        const annualDf = makeDiscountFactors(years, rate, baseYear, convention);
        const invDf = makeInvestmentDiscountFactors(years, rate, baseYear, convention, investmentTiming);
        return sumDiscounted(revenueMinusOpex, annualDf) - sumDiscounted(capex, invDf);
    };

    let low = IRR_LOWER_BOUND;
    let high = IRR_UPPER_BOUND;
    let npvLow = npvAtRate(low);
    let npvHigh = npvAtRate(high);

    if (!Number.isFinite(npvLow) || !Number.isFinite(npvHigh)) {
        return { irr: null, status: IrrStatus.OUT_OF_DOMAIN };
    }

    if (Math.abs(npvLow) < IRR_TOLERANCE) return { irr: low, status: IrrStatus.CONVERGED };
    if (Math.abs(npvHigh) < IRR_TOLERANCE) return { irr: high, status: IrrStatus.CONVERGED };

    if (npvLow * npvHigh > 0) {
        // Try bracket expansion upwards up to 100 (10,000%)
        let expanded = false;
        let testHigh = high;
        while (testHigh < 100) {
            testHigh *= 2;
            const npvTest = npvAtRate(testHigh);
            if (!Number.isFinite(npvTest)) break;
            if (npvLow * npvTest <= 0) {
                high = testHigh;
                npvHigh = npvTest;
                expanded = true;
                break;
            }
        }
        if (!expanded) {
            return { irr: null, status: IrrStatus.OUT_OF_DOMAIN };
        }
    }

    for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        const npvMid = npvAtRate(mid);
        if (!Number.isFinite(npvMid)) {
            return { irr: null, status: IrrStatus.OUT_OF_DOMAIN };
        }
        if (Math.abs(npvMid) < IRR_TOLERANCE || high - low < IRR_TOLERANCE) {
            return { irr: mid, status: IrrStatus.CONVERGED };
        }
        if (npvLow * npvMid < 0) {
            high = mid;
            npvHigh = npvMid;
        } else {
            low = mid;
            npvLow = npvMid;
        }
    }

    return { irr: (low + high) / 2, status: IrrStatus.CONVERGED };
}

/**
 * Finds the discount rate where the net present value of the cash flow is zero.
 *
 * Backwards-compatible signature for netCashFlow array.
 */
export function computeInternalRateOfReturn(
    years: number[],
    netCashFlow: number[],
    baseYear: number,
    convention: DiscountConvention,
): number | null {
    const res = computeInternalRateOfReturnDetailed(
        years,
        netCashFlow,
        years.map(() => 0),
        baseYear,
        convention,
        InvestmentTiming.FOLLOW_ANNUAL_TIMING,
    );
    return res.irr;
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
    const hasOilData = input.hasOilData ?? true;
    const hasSalesGasData = input.hasSalesGasData ?? true;

    const baseYear = assumptions.baseYear ?? years[0] ?? 0;
    const convention = assumptions.convention;
    // Default investment timing follows annual convention if unspecified, but default in UI is START_OF_YEAR
    const investmentTiming = assumptions.investmentTiming ?? InvestmentTiming.FOLLOW_ANNUAL_TIMING;

    const discountFactors = makeDiscountFactors(years, assumptions.discountRateFraction, baseYear, convention);
    const investmentDiscountFactors = makeInvestmentDiscountFactors(
        years,
        assumptions.discountRateFraction,
        baseYear,
        convention,
        investmentTiming,
    );

    const discountedOilVolume = sumDiscounted(oilVolumes, discountFactors);
    const discountedSalesGasVolume = sumDiscounted(salesGasVolumes, discountFactors);
    const discountedOilEquivalents =
        discountedOilVolume + discountedSalesGasVolume / assumptions.gasToOilEquivalentDivisor;

    const capexPerYear = years.map((year) => costLookup.get(year)?.capex ?? 0);
    const opexPerYear = years.map((year) => costLookup.get(year)?.opex ?? 0);

    const pvCosts =
        sumDiscounted(capexPerYear, investmentDiscountFactors) + sumDiscounted(opexPerYear, discountFactors);

    // Check if at least one cost entry is entered and non-zero in the evaluation window
    const hasAnyCostEntry = years.some((year) => {
        const c = costLookup.get(year);
        return c !== undefined && (c.capex !== 0 || c.opex !== 0);
    });

    const isOilRevenueExcluded = assumptions.excludeOilRevenue ?? false;
    const isGasRevenueExcluded = assumptions.excludeGasRevenue ?? false;

    // Oil price is resolved if specified or explicitly excluded (valued at 0)
    const hasOilPrice = !hasOilData || assumptions.oilPricePerVolume !== null || isOilRevenueExcluded;
    // Gas price is resolved if specified or explicitly excluded (valued at 0)
    // If sales gas is completely absent or 0 in all years, gas price requirement is also considered satisfied (valued at 0)
    const isAllGasZero = salesGasVolumes.every((v) => Math.abs(v) < 1e-12);
    const hasGasPrice = assumptions.gasPricePerVolume !== null || isGasRevenueExcluded || isAllGasZero;

    const effectiveOilPrice = isOilRevenueExcluded ? 0 : (assumptions.oilPricePerVolume ?? 0);
    const effectiveGasPrice = isGasRevenueExcluded ? 0 : (assumptions.gasPricePerVolume ?? 0);

    // Financial NPV is available when revenue assumptions are sufficiently specified:
    // If oil price is provided (or excluded) and gas price is provided (or excluded or all gas is zero),
    // and at least one price or exclusion or cost is actively entered.
    const hasAnyPriceEntered = assumptions.oilPricePerVolume !== null || assumptions.gasPricePerVolume !== null;
    const canComputeFinancialNpv =
        (hasAnyPriceEntered || isOilRevenueExcluded || isGasRevenueExcluded || hasAnyCostEntry) &&
        hasOilPrice &&
        hasGasPrice &&
        (hasSalesGasData || isGasRevenueExcluded);

    let netCashFlow: number[] | null = null;
    let discountedNetCashFlow: number[] | null = null;
    let cumulativeDiscountedCashFlow: number[] | null = null;
    let npv: number | null = null;
    let irr: number | null = null;
    let irrStatus: IrrStatus | undefined = undefined;

    if (canComputeFinancialNpv) {
        const revenueMinusOpexPerYear = years.map(
            (_, i) => effectiveOilPrice * oilVolumes[i] + effectiveGasPrice * salesGasVolumes[i] - opexPerYear[i],
        );
        netCashFlow = years.map((_, i) => revenueMinusOpexPerYear[i] - capexPerYear[i]);

        discountedNetCashFlow = years.map(
            (_, i) => revenueMinusOpexPerYear[i] * discountFactors[i] - capexPerYear[i] * investmentDiscountFactors[i],
        );

        let runningCumulative = 0;
        cumulativeDiscountedCashFlow = discountedNetCashFlow.map((flow) => {
            runningCumulative += flow;
            return runningCumulative;
        });

        npv =
            sumDiscounted(revenueMinusOpexPerYear, discountFactors) -
            sumDiscounted(capexPerYear, investmentDiscountFactors);

        const irrResult = computeInternalRateOfReturnDetailed(
            years,
            revenueMinusOpexPerYear,
            capexPerYear,
            baseYear,
            convention,
            investmentTiming,
        );
        irr = irrResult.irr;
        irrStatus = irrResult.status;
    }

    // Break-even oil price calculation:
    // PV_costs = sum_y(capex(y) * d(y, investment_timing) + opex(y) * d(y, annual_timing))
    // PV_gas_revenue = gas_price * D_gas
    // break_even_oil_price = (PV_costs - PV_gas_revenue) / D_oil
    // Requires: at least one cost entry non-zero in evaluation window, resolved gas price assumption,
    // and |D_oil| > BREAK_EVEN_OIL_VOLUME_TOLERANCE.
    let breakEvenOilPrice: number | null = null;
    let breakEvenSlopeDirection: BreakEvenSlopeDirection | undefined = undefined;

    if (hasOilData && hasAnyCostEntry && hasGasPrice && (hasSalesGasData || isGasRevenueExcluded)) {
        if (Math.abs(discountedOilVolume) > BREAK_EVEN_OIL_VOLUME_TOLERANCE) {
            const pvGasRevenue = effectiveGasPrice * discountedSalesGasVolume;
            breakEvenOilPrice = (pvCosts - pvGasRevenue) / discountedOilVolume;
            breakEvenSlopeDirection =
                discountedOilVolume > 0 ? BreakEvenSlopeDirection.POSITIVE : BreakEvenSlopeDirection.NEGATIVE;
        }
    }

    return {
        realization: alignedInput.realization,
        oilVolumes,
        salesGasVolumes,
        hasOilData,
        hasSalesGasData,
        gasToOilEquivalentDivisor: assumptions.gasToOilEquivalentDivisor,
        discountedOilVolume,
        discountedSalesGasVolume,
        discountedOilEquivalents,
        undiscountedOilVolume: sumOf(oilVolumes),
        undiscountedSalesGasVolume: sumOf(salesGasVolumes),
        npv,
        irr,
        irrStatus,
        breakEvenOilPrice,
        breakEvenSlopeDirection,
        netCashFlow,
        discountedNetCashFlow,
        cumulativeDiscountedCashFlow,
        years,
        discountFactors,
        investmentDiscountFactors,
    };
}

/** Extracts cumulative discounted values through an inclusive calendar year without rebasing. */
export function extractEarlyValue(result: RealizationEconomicResult, endYear: number): EarlyValueResult {
    const includedIndexes = result.years.flatMap((year, index) => (year <= endYear ? [index] : []));
    const discountedOilVolume = sumDiscounted(
        includedIndexes.map((index) => result.oilVolumes[index]),
        includedIndexes.map((index) => result.discountFactors[index]),
    );
    const discountedSalesGasVolume = sumDiscounted(
        includedIndexes.map((index) => result.salesGasVolumes[index]),
        includedIndexes.map((index) => result.discountFactors[index]),
    );

    return {
        discountedOilVolume,
        discountedSalesGasVolume,
        discountedOilEquivalents: discountedOilVolume + discountedSalesGasVolume / result.gasToOilEquivalentDivisor,
        npv: result.discountedNetCashFlow
            ? sumOf(includedIndexes.map((index) => result.discountedNetCashFlow![index]))
            : null,
    };
}

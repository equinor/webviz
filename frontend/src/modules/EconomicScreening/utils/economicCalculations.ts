import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import { IrrStatus } from "@modules/EconomicScreening/typesAndEnums";

export const IRR_LOWER_BOUND = -0.9999;
export const IRR_UPPER_BOUND = 10;
export const IRR_MAX_ITERATIONS = 200;
export const IRR_TOLERANCE = 1e-9;
export const BREAK_EVEN_OIL_VOLUME_TOLERANCE = 1e-9;

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

/** An undiscounted cash-flow event at a time measured in years from the valuation date. */
export type TimedCashFlowEvent = {
    time: number;
    value: number;
};

/** Combines events occurring at the same time, drops zero events, and orders them in time. */
export function aggregateCoincidentEvents(events: TimedCashFlowEvent[]): TimedCashFlowEvent[] {
    const eventsByTime = new Map<number, number>();
    for (const event of events) {
        eventsByTime.set(event.time, (eventsByTime.get(event.time) ?? 0) + event.value);
    }
    return Array.from(eventsByTime, ([time, value]) => ({ time, value }))
        .filter((event) => event.value !== 0)
        .sort((first, second) => first.time - second.time);
}

/**
 * Finds the rate where the present value of the given timed events is zero.
 *
 * Event magnitudes are normalized before classification and solving, so that very small or very
 * large cash flows are handled identically. Conventionality is classified on the same timed events
 * that are solved, after combining only events at identical times; coarser netting such as annual
 * totals can hide sign changes and is not used.
 */
export function computeInternalRateOfReturnFromEvents(events: TimedCashFlowEvent[]): IrrComputationResult {
    const aggregatedEvents = aggregateCoincidentEvents(events);
    if (aggregatedEvents.length === 0) {
        return { irr: null, status: IrrStatus.NO_FINITE_ROOT };
    }

    const cashFlowScale = Math.max(...aggregatedEvents.map((event) => Math.abs(event.value)));
    const normalizedEvents = aggregatedEvents.map((event) => ({ ...event, value: event.value / cashFlowScale }));
    const combinedEvents = normalizedEvents.map((event) => event.value);

    const hasPositive = combinedEvents.some((v) => v > 1e-12);
    const hasNegative = combinedEvents.some((v) => v < -1e-12);

    if (!hasPositive || !hasNegative) {
        return { irr: null, status: IrrStatus.NO_FINITE_ROOT };
    }

    if (!isConventionalCashFlow(combinedEvents)) {
        return { irr: null, status: IrrStatus.NON_CONVENTIONAL };
    }

    const firstEventTime = normalizedEvents[0].time;
    const residualTolerance = 1e-12;
    const npvAtRate = (rate: number): number => {
        return normalizedEvents.reduce(
            (sum, event) => sum + event.value / Math.pow(1 + rate, event.time - firstEventTime),
            0,
        );
    };
    const npvSignAtRate = (rate: number): number => {
        const logarithm = Math.log1p(rate);
        const exponents = normalizedEvents.map((event) => -(event.time - firstEventTime) * logarithm);
        const largestExponent = Math.max(...exponents);
        return normalizedEvents.reduce(
            (sum, event, index) => sum + event.value * Math.exp(exponents[index] - largestExponent),
            0,
        );
    };

    let low = IRR_LOWER_BOUND;
    let high = IRR_UPPER_BOUND;
    let npvLow = npvAtRate(low);
    let npvHigh = npvAtRate(high);

    const npvLowSign = Number.isFinite(npvLow) ? npvLow : npvSignAtRate(low);
    const npvHighSign = Number.isFinite(npvHigh) ? npvHigh : npvSignAtRate(high);

    if (Number.isFinite(npvLow) && Math.abs(npvLow) < residualTolerance)
        return { irr: low, status: IrrStatus.CONVERGED };
    if (Number.isFinite(npvHigh) && Math.abs(npvHigh) < residualTolerance)
        return { irr: high, status: IrrStatus.CONVERGED };

    if (npvLowSign * npvHighSign > 0) {
        // Try bracket expansion upwards up to 100 (10,000%)
        let expanded = false;
        let testHigh = high;
        while (testHigh < 100) {
            testHigh *= 2;
            const npvTest = npvAtRate(testHigh);
            const npvTestSign = Number.isFinite(npvTest) ? npvTest : npvSignAtRate(testHigh);
            if (npvLowSign * npvTestSign <= 0) {
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
        if ((Number.isFinite(npvMid) && Math.abs(npvMid) < residualTolerance) || high - low < IRR_TOLERANCE) {
            return { irr: mid, status: IrrStatus.CONVERGED };
        }
        const npvMidSign = Number.isFinite(npvMid) ? npvMid : npvSignAtRate(mid);
        if (npvLowSign * npvMidSign < 0) {
            high = mid;
            npvHigh = npvMid;
        } else {
            low = mid;
            npvLow = npvMid;
        }
    }

    return { irr: (low + high) / 2, status: IrrStatus.CONVERGED };
}

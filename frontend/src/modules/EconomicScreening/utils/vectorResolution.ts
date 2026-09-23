import type { VectorRealizationData_api } from "@api";

import { adaptSourceCoverage, combineMonthCoverage, MonthCoverage, SourceKind } from "./monthlyProduction";

export const OIL_PRODUCTION_VECTOR = "FOPT";
export const SALES_GAS_VECTOR = "FGST";
export const GAS_PRODUCTION_VECTOR = "FGPT";
export const GAS_INJECTION_VECTOR = "FGIT";
export const GAS_CONSUMPTION_VECTOR = "FGCT";

export type SalesGasStrategy =
    | { kind: "DIRECT"; hasGasConsumption: boolean }
    | {
          kind: "DERIVED";
          hasGasProduction: boolean;
          hasGasInjection: boolean;
          hasGasConsumption: boolean;
      }
    | { kind: "UNAVAILABLE" };

export type RealizationCumulativeSeries = {
    realization: number;
    timestampsUtcMs: number[];
    values: number[];
    /** One entry per adjacent timestamp pair, combined over every required source vector. */
    intervalCoverage: MonthCoverage[];
    /** End of common raw-source support over every required source vector; null when unverified. */
    supportEndUtcMs: number | null;
};

export type MissingComponentAssumptions = {
    assumeMissingInjectionAsZero?: boolean;
    assumeMissingConsumptionAsZero?: boolean;
};

export type DerivedSalesGasCumulative = {
    series: RealizationCumulativeSeries[];
    missingInjectionRealizations: number[];
    missingConsumptionRealizations: number[];
    incompleteInjectionRealizations: number[];
    incompleteConsumptionRealizations: number[];
};

export type CumulativeTerminalSummary = {
    nonZeroCount: number;
    zeroCount: number;
    missingOrInvalidRealizations: number[];
};

/**
 * Sales gas is taken from FGST when the ensemble provides it, otherwise derived as
 * FGPT - FGIT - FGCT from whichever components are available.
 */
export function determineSalesGasStrategy(availableVectorNames: string[]): SalesGasStrategy {
    const available = new Set(availableVectorNames);
    if (available.has(SALES_GAS_VECTOR)) {
        return { kind: "DIRECT", hasGasConsumption: available.has(GAS_CONSUMPTION_VECTOR) };
    }
    if (!available.has(GAS_PRODUCTION_VECTOR)) {
        return { kind: "UNAVAILABLE" };
    }
    return {
        kind: "DERIVED",
        hasGasProduction: true,
        hasGasInjection: available.has(GAS_INJECTION_VECTOR),
        hasGasConsumption: available.has(GAS_CONSUMPTION_VECTOR),
    };
}

function makeValueByTimestampMap(realizationData: VectorRealizationData_api): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 0; i < realizationData.timestampsUtcMs.length; i++) {
        map.set(realizationData.timestampsUtcMs[i], realizationData.values[i]);
    }
    return map;
}

function makeDataByRealizationMap(data: VectorRealizationData_api[]): Map<number, VectorRealizationData_api> {
    return new Map(data.map((elm) => [elm.realization, elm]));
}

export function toRealizationCumulativeSeries(
    data: VectorRealizationData_api[],
    sourceKind: SourceKind = SourceKind.REGULAR,
): RealizationCumulativeSeries[] {
    return data.map((elm) => {
        const coverage = adaptSourceCoverage(elm, sourceKind);
        return {
            realization: elm.realization,
            timestampsUtcMs: elm.timestampsUtcMs,
            values: elm.values,
            intervalCoverage: coverage.intervalCoverage,
            supportEndUtcMs: coverage.supportEndUtcMs,
        };
    });
}

/** Coverage of a component for each production interval, matched by boundary dates rather than position. */
function componentCoverageForIntervals(
    productionTimestampsUtcMs: number[],
    component: VectorRealizationData_api,
    sourceKind: SourceKind,
): MonthCoverage[] {
    const componentCoverage = adaptSourceCoverage(component, sourceKind).intervalCoverage;
    const indexByTimestamp = new Map(component.timestampsUtcMs.map((timestamp, index) => [timestamp, index]));
    return productionTimestampsUtcMs.slice(0, -1).map((intervalStartUtcMs, index) => {
        const componentIndex = indexByTimestamp.get(intervalStartUtcMs);
        if (
            componentIndex === undefined ||
            component.timestampsUtcMs[componentIndex + 1] !== productionTimestampsUtcMs[index + 1]
        ) {
            return MonthCoverage.UNVERIFIED;
        }
        return componentCoverage[componentIndex];
    });
}

/**
 * Builds cumulative sales gas per realization as FGPT - FGIT - FGCT, using the FGPT timestamps as
 * the master sampling. Missing vectors require an explicit zero assumption; missing samples always
 * exclude the affected realization.
 */
export function deriveSalesGasCumulative(
    gasProductionData: VectorRealizationData_api[],
    gasInjectionData: VectorRealizationData_api[],
    gasConsumptionData: VectorRealizationData_api[],
    assumptions: MissingComponentAssumptions = {},
    sourceKind: SourceKind = SourceKind.REGULAR,
): DerivedSalesGasCumulative {
    const injectionByRealization = makeDataByRealizationMap(gasInjectionData);
    const consumptionByRealization = makeDataByRealizationMap(gasConsumptionData);
    const missingInjectionRealizations: number[] = [];
    const missingConsumptionRealizations: number[] = [];
    const incompleteInjectionRealizations: number[] = [];
    const incompleteConsumptionRealizations: number[] = [];
    const series: RealizationCumulativeSeries[] = [];

    for (const production of gasProductionData) {
        const injection = injectionByRealization.get(production.realization);
        const consumption = consumptionByRealization.get(production.realization);
        let hasMissingComponent = false;
        if (!injection && !assumptions.assumeMissingInjectionAsZero) {
            missingInjectionRealizations.push(production.realization);
            hasMissingComponent = true;
        }
        if (!consumption && !assumptions.assumeMissingConsumptionAsZero) {
            missingConsumptionRealizations.push(production.realization);
            hasMissingComponent = true;
        }
        if (hasMissingComponent) {
            continue;
        }
        const injectionByTimestamp = injection ? makeValueByTimestampMap(injection) : null;
        const consumptionByTimestamp = consumption ? makeValueByTimestampMap(consumption) : null;

        const hasIncompleteInjection = injectionByTimestamp
            ? production.timestampsUtcMs.some((timestampUtcMs) => !injectionByTimestamp.has(timestampUtcMs))
            : false;
        const hasIncompleteConsumption = consumptionByTimestamp
            ? production.timestampsUtcMs.some((timestampUtcMs) => !consumptionByTimestamp.has(timestampUtcMs))
            : false;
        if (hasIncompleteInjection || hasIncompleteConsumption) {
            if (hasIncompleteInjection) incompleteInjectionRealizations.push(production.realization);
            if (hasIncompleteConsumption) incompleteConsumptionRealizations.push(production.realization);
            continue;
        }

        const values = production.timestampsUtcMs.map((timestampUtcMs, i) => {
            const injected = injectionByTimestamp?.get(timestampUtcMs) ?? 0;
            const consumed = consumptionByTimestamp?.get(timestampUtcMs) ?? 0;
            return production.values[i] - injected - consumed;
        });

        const productionCoverage = adaptSourceCoverage(production, sourceKind);
        const componentCoverages = [injection, consumption]
            .filter((component): component is VectorRealizationData_api => component !== undefined)
            .map((component) => componentCoverageForIntervals(production.timestampsUtcMs, component, sourceKind));
        const componentSupportEnds = [injection, consumption]
            .filter((component): component is VectorRealizationData_api => component !== undefined)
            .map((component) => adaptSourceCoverage(component, sourceKind).supportEndUtcMs);
        const supportEnds = [productionCoverage.supportEndUtcMs, ...componentSupportEnds];

        series.push({
            realization: production.realization,
            timestampsUtcMs: production.timestampsUtcMs,
            values,
            intervalCoverage: productionCoverage.intervalCoverage.map((coverage, index) =>
                combineMonthCoverage(
                    coverage,
                    ...componentCoverages.map((componentCoverage) => componentCoverage[index]),
                ),
            ),
            supportEndUtcMs: supportEnds.some((supportEnd) => supportEnd === null)
                ? null
                : Math.min(...(supportEnds as number[])),
        });
    }

    return {
        series,
        missingInjectionRealizations,
        missingConsumptionRealizations,
        incompleteInjectionRealizations,
        incompleteConsumptionRealizations,
    };
}

/** True when every realization ends at zero cumulative volume, i.e. the process is not modelled. */
export function isCumulativeVectorAllZero(data: VectorRealizationData_api[]): boolean {
    if (data.length === 0) {
        return false;
    }
    return data.every((elm) => {
        const lastValue = elm.values.at(-1);
        return lastValue === undefined || lastValue === 0;
    });
}

export function summarizeCumulativeVectorTerminals(
    data: VectorRealizationData_api[],
    expectedRealizations: number[],
): CumulativeTerminalSummary {
    const dataByRealization = makeDataByRealizationMap(data);
    const missingOrInvalidRealizations: number[] = [];
    let nonZeroCount = 0;
    let zeroCount = 0;

    for (const realizationNumber of expectedRealizations) {
        const realization = dataByRealization.get(realizationNumber);
        const terminalValue = realization?.values.at(-1);
        if (
            !realization ||
            realization.timestampsUtcMs.length !== realization.values.length ||
            terminalValue === undefined ||
            !Number.isFinite(terminalValue)
        ) {
            missingOrInvalidRealizations.push(realizationNumber);
        } else if (Math.abs(terminalValue) > 1e-12) {
            nonZeroCount += 1;
        } else {
            zeroCount += 1;
        }
    }

    return { nonZeroCount, zeroCount, missingOrInvalidRealizations };
}

export function countCumulativeVectorNonZeroRealizations(data: VectorRealizationData_api[]): number {
    return data.filter((realization) => {
        const terminalValue = realization.values.at(-1);
        return terminalValue !== undefined && Number.isFinite(terminalValue) && Math.abs(terminalValue) > 1e-12;
    }).length;
}

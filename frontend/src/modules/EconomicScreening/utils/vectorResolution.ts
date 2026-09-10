import type { VectorRealizationData_api } from "@api";

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

export function toRealizationCumulativeSeries(data: VectorRealizationData_api[]): RealizationCumulativeSeries[] {
    return data.map((elm) => ({
        realization: elm.realization,
        timestampsUtcMs: elm.timestampsUtcMs,
        values: elm.values,
    }));
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

        series.push({
            realization: production.realization,
            timestampsUtcMs: production.timestampsUtcMs,
            values,
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

export function countCumulativeVectorNonZeroRealizations(data: VectorRealizationData_api[]): number {
    return data.filter((realization) => {
        const terminalValue = realization.values.at(-1);
        return terminalValue !== undefined && Number.isFinite(terminalValue) && Math.abs(terminalValue) > 1e-12;
    }).length;
}

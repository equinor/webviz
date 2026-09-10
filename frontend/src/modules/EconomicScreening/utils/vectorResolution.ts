import type { VectorRealizationData_api } from "@api";

export const OIL_PRODUCTION_VECTOR = "FOPT";
export const SALES_GAS_VECTOR = "FGST";
export const GAS_PRODUCTION_VECTOR = "FGPT";
export const GAS_INJECTION_VECTOR = "FGIT";
export const GAS_CONSUMPTION_VECTOR = "FGCT";

export type SalesGasStrategy =
    | { kind: "DIRECT" }
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

/**
 * Sales gas is taken from FGST when the ensemble provides it, otherwise derived as
 * FGPT - FGIT - FGCT from whichever components are available.
 */
export function determineSalesGasStrategy(availableVectorNames: string[]): SalesGasStrategy {
    const available = new Set(availableVectorNames);
    if (available.has(SALES_GAS_VECTOR)) {
        return { kind: "DIRECT" };
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
 * the master sampling and treating missing components as zero.
 */
export function deriveSalesGasCumulative(
    gasProductionData: VectorRealizationData_api[],
    gasInjectionData: VectorRealizationData_api[],
    gasConsumptionData: VectorRealizationData_api[],
): RealizationCumulativeSeries[] {
    const injectionByRealization = makeDataByRealizationMap(gasInjectionData);
    const consumptionByRealization = makeDataByRealizationMap(gasConsumptionData);

    return gasProductionData.map((production) => {
        const injection = injectionByRealization.get(production.realization);
        const consumption = consumptionByRealization.get(production.realization);
        const injectionByTimestamp = injection ? makeValueByTimestampMap(injection) : null;
        const consumptionByTimestamp = consumption ? makeValueByTimestampMap(consumption) : null;

        const values = production.timestampsUtcMs.map((timestampUtcMs, i) => {
            const injected = injectionByTimestamp?.get(timestampUtcMs) ?? 0;
            const consumed = consumptionByTimestamp?.get(timestampUtcMs) ?? 0;
            return production.values[i] - injected - consumed;
        });

        return {
            realization: production.realization,
            timestampsUtcMs: production.timestampsUtcMs,
            values,
        };
    });
}

/** True when every realization ends at zero cumulative volume, i.e. the process is not modelled. */
export function isCumulativeVectorAllZero(data: VectorRealizationData_api[]): boolean {
    if (data.length === 0) {
        return true;
    }
    return data.every((elm) => {
        const lastValue = elm.values.at(-1);
        return lastValue === undefined || lastValue === 0;
    });
}

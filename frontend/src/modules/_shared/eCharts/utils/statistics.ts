import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import type { PointStatistics, TimeseriesStatistics } from "../types";

export function computePointStatistics(values: number[]): PointStatistics {
    if (values.length === 0) {
        return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, p10: 0, p50: 0, p90: 0 };
    }

    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;
    const variance = count > 1 ? values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (count - 1) : 0;

    return {
        count,
        mean,
        stdDev: Math.sqrt(variance),
        min: Math.min(...values),
        max: Math.max(...values),
        p10: computeReservesP10(values),
        p50: computeP50(values),
        p90: computeReservesP90(values),
    };
}

export function computeTimeseriesStatistics(valuesPerRealization: number[][]): TimeseriesStatistics {
    const numReals = valuesPerRealization.length;
    const numTimesteps = numReals > 0 ? valuesPerRealization[0].length : 0;

    const mean = new Array<number>(numTimesteps).fill(0);
    const p10 = new Array<number>(numTimesteps).fill(0);
    const p50 = new Array<number>(numTimesteps).fill(0);
    const p90 = new Array<number>(numTimesteps).fill(0);
    const min = new Array<number>(numTimesteps).fill(0);
    const max = new Array<number>(numTimesteps).fill(0);

    if (numReals === 0) return { mean, p10, p50, p90, min, max };

    for (let t = 0; t < numTimesteps; t++) {
        const col: number[] = [];
        let sum = 0;
        for (let r = 0; r < numReals; r++) {
            const v = valuesPerRealization[r][t];
            col.push(v);
            sum += v;
        }

        mean[t] = sum / numReals;
        min[t] = Math.min(...col);
        max[t] = Math.max(...col);
        p10[t] = computeReservesP10(col);
        p50[t] = computeP50(col);
        p90[t] = computeReservesP90(col);
    }

    return { mean, p10, p50, p90, min, max };
}

import { MinMax } from "@lib/utils/MinMax";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import type { PointStatistics, TimeseriesStatistics } from "../types";

export function computePointStatistics(values: number[]): PointStatistics {
    const finite = values.filter(Number.isFinite);
    if (finite.length === 0) {
        return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, p10: 0, p50: 0, p90: 0 };
    }

    const count = finite.length;
    const mean = finite.reduce((a, b) => a + b, 0) / count;
    const variance = count > 1 ? finite.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (count - 1) : 0;
    const minMax = MinMax.fromNumericValues(finite);

    return {
        count,
        mean,
        stdDev: Math.sqrt(variance),
        min: minMax.min,
        max: minMax.max,
        p10: computeReservesP10(finite),
        p50: computeP50(finite),
        p90: computeReservesP90(finite),
    };
}

export function computeTimeseriesStatistics(valuesPerMember: number[][]): TimeseriesStatistics {
    const numMembers = valuesPerMember.length;
    const numTimesteps = numMembers > 0 ? valuesPerMember[0].length : 0;

    const mean = new Array<number>(numTimesteps).fill(0);
    const p10 = new Array<number>(numTimesteps).fill(0);
    const p50 = new Array<number>(numTimesteps).fill(0);
    const p90 = new Array<number>(numTimesteps).fill(0);
    const min = new Array<number>(numTimesteps).fill(0);
    const max = new Array<number>(numTimesteps).fill(0);

    if (numMembers === 0) return { mean, p10, p50, p90, min, max };

    for (let t = 0; t < numTimesteps; t++) {
        const col: number[] = [];
        let sum = 0;
        for (let r = 0; r < numMembers; r++) {
            const v = valuesPerMember[r][t];
            if (!Number.isFinite(v)) continue;
            col.push(v);
            sum += v;
        }

        mean[t] = col.length > 0 ? sum / col.length : 0;
        const minMax = MinMax.fromNumericValues(col);
        min[t] = minMax.min;
        max[t] = minMax.max;
        p10[t] = computeReservesP10(col);
        p50[t] = computeP50(col);
        p90[t] = computeReservesP90(col);
    }

    return { mean, p10, p50, p90, min, max };
}

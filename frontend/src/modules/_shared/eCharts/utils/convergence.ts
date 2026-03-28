import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

export type ConvergencePoint = { realization: number; mean: number; p10: number; p90: number };

/** Running mean/p10/p90 as realizations are added one at a time. */
export function calcConvergence(pairs: { realization: number; value: number }[]): ConvergencePoint[] {
    const growing: number[] = [];
    const result: ConvergencePoint[] = [];
    let sum = 0;

    for (const [i, pair] of pairs.entries()) {
        growing.push(pair.value);
        sum += pair.value;
        result.push({
            realization: pair.realization,
            mean: sum / (i + 1),
            p10: computeReservesP10(growing),
            p90: computeReservesP90(growing),
        });
    }

    return result;
}

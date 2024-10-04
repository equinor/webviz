import { computeQuantile } from "@modules/_shared/statistics";

export type RealizationAndResult = {
    realization: number;
    resultValue: number;
};

export type ConvergenceResult = {
    realization: number;
    mean: number;
    p10: number;
    p90: number;
};

export function calcConvergenceArray(realizationAndResultArray: RealizationAndResult[]): ConvergenceResult[] {
    const sortedArray = realizationAndResultArray.sort((a, b) => a.realization - b.realization);
    const growingDataArray: number[] = [];
    const convergenceArray: ConvergenceResult[] = [];
    let sum = 0;
    for (const [index, realizationAndResult] of sortedArray.entries()) {
        growingDataArray.push(realizationAndResult.resultValue);
        sum += realizationAndResult.resultValue;
        const mean = sum / (index + 1);

        const p10 = computeQuantile(growingDataArray, 0.1);
        const p90 = computeQuantile(growingDataArray, 0.9);

        convergenceArray.push({
            realization: realizationAndResult.realization,
            mean,
            p10,
            p90,
        });
    }

    return convergenceArray;
}

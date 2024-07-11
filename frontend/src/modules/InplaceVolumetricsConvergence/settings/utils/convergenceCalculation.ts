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

    const convergenceArray: ConvergenceResult[] = [];
    let sum = 0;
    let sumOfSquares = 0;
    for (const [index, realizationAndResult] of sortedArray.entries()) {
        sum += realizationAndResult.resultValue;
        sumOfSquares += realizationAndResult.resultValue * realizationAndResult.resultValue;
        const mean = sum / (index + 1);
        const variance = sumOfSquares / (index + 1) - mean ** 2;
        const stdDev = Math.sqrt(variance);
        const p10 = mean - 1.282 * stdDev;
        const p90 = mean + 1.282 * stdDev;
        convergenceArray.push({
            realization: realizationAndResult.realization,
            mean,
            p10,
            p90,
        });
    }

    return convergenceArray;
}

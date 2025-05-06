export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    // Simple linear regression implementation
    // Returns the slope and intercept of the best-fit line
    const n = x.length;
    if (n === 0) {
        return { slope: 0, intercept: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const numerator = sumXY - n * meanX * meanY;
    const denominator = sumX2 - n * meanX * meanX;

    let slope = 0;
    if (denominator !== 0) {
        slope = numerator / denominator;
    }

    const intercept = meanY - slope * meanX;

    return { slope, intercept };
}

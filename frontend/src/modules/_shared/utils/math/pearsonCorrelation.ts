export function pearsonCorrelation(x: number[], y: number[]): number | null {
    const n = x.length;
    if (n < 2) return null; //  Cant corrlate with less than 2 points

    const avgX = x.reduce((a, b) => a + b, 0) / n;
    const avgY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - avgX;
        const dy = y[i] - avgY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) {
        return null; // No variation
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? null : numerator / denominator;
}

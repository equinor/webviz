/** Kernel Density Estimation (KDE) using a Gaussian kernel and Silverman's Rule of Thumb. */
export function computeKde(sorted: number[], numPoints: number): [number, number][] {
    const n = sorted.length;
    if (n === 0) return [];

    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;

    // O(n) mean + stdDev
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    const iqr = sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)];

    // Silverman's rule of thumb; fall back to epsilon when all values are identical
    const bandwidth = 0.9 * Math.min(stdDev, iqr / 1.34) * Math.pow(n, -0.2);
    const h = bandwidth || 1e-4;

    const pad = range * 0.1 || h * 3;
    const step = (range + 2 * pad) / (numPoints - 1);
    const result: [number, number][] = [];

    const SQRT_2PI = Math.sqrt(2 * Math.PI);
    const normalization = 1 / (n * h * SQRT_2PI);

    for (let i = 0; i < numPoints; i++) {
        const x = min - pad + i * step;
        let sumKernel = 0;
        for (let j = 0; j < n; j++) {
            const z = (x - sorted[j]) / h;
            if (z > -4 && z < 4) {
                sumKernel += Math.exp(-0.5 * z * z);
            }
        }
        result.push([x, sumKernel * normalization]);
    }

    return result;
}

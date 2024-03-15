export function compareWithTolerance(a: number, b: number, tolerance = 1e-6) {
    return Math.abs(a - b) < tolerance;
}

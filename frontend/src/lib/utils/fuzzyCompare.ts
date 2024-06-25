export function fuzzyCompare(a: number, b: number, epsilon: number): boolean {
    return Math.abs(a - b) < epsilon;
}

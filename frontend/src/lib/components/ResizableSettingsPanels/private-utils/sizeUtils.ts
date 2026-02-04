/**
 * Converts a size in pixels to a size in percent.
 *
 * Epsilon is added to avoid floating point precision issues when comparing sizes.
 */
export function pxToPercent(px: number, totalPx: number, epsilon?: number): number {
    return (px / totalPx) * 100 + (epsilon ?? 0);
}

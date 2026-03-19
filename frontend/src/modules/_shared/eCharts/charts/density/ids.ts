export const DENSITY_CATEGORY = "density";

export type DensityRole = "primary" | "memberPoints";

/**
 * Format: chartType|role|traceName|axisIndex
 */
export function makeDensitySeriesId(
    traceName: string,
    role: DensityRole,
    axisIndex: number
): string {
    return `${DENSITY_CATEGORY}|${role}|${traceName}|${axisIndex}`;
}
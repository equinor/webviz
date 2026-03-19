export const EXCEEDANCE_CATEGORY = "exceedance";

export type ExceedanceRole = "primary";

/**
 * Format: chartType|role|traceName|axisIndex
 */
export function makeExceedanceSeriesId(
    traceName: string,
    role: ExceedanceRole,
    axisIndex: number
): string {
    return `${EXCEEDANCE_CATEGORY}|${role}|${traceName}|${axisIndex}`;
}
export const CONVERGENCE_CATEGORY = "convergence";

export type ConvergenceRole = "summary" | "band";
export type ConvergenceStatisticKey = "mean" | "p10" | "p90";

/**
 * Format: chartType|role|traceName|axisIndex|statKey
 */
export function makeConvergenceSeriesId(
    traceName: string,
    role: ConvergenceRole,
    axisIndex: number,
    statKey: ConvergenceStatisticKey | "" = ""
): string {
    return `${CONVERGENCE_CATEGORY}|${role}|${traceName}|${axisIndex}|${statKey}`;
}
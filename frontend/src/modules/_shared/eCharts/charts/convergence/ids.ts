import { makeSeriesId } from "../../core/seriesId";

export const CONVERGENCE_CATEGORY = "convergence";

export type ConvergenceRole = "summary" | "band";
export type ConvergenceStatisticKey = "mean" | "p10" | "p90";

export function makeConvergenceSeriesId(
    traceName: string,
    role: ConvergenceRole,
    axisIndex: number,
    statKey: ConvergenceStatisticKey | "" = ""
): string {
    return makeSeriesId({ chartType: CONVERGENCE_CATEGORY, role, name: traceName, subKey: statKey, axisIndex });
}
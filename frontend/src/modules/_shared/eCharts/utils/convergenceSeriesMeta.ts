import { parseSeriesId } from "./seriesId";

export type ConvergenceStatisticKey = "p90" | "mean" | "p10";

export function formatConvergenceStatLabel(statKey: string): string {
    switch (statKey) {
        case "p90":
            return "P90";
        case "p10":
            return "P10";
        case "mean":
            return "Mean";
        default:
            return statKey;
    }
}

export function getConvergenceSeriesStatKey(seriesId: string | undefined): ConvergenceStatisticKey | null {
    if (!seriesId) return null;
    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.category !== "convergence") return null;

    const statKey = parsed.qualifier;
    if (statKey === "p90" || statKey === "mean" || statKey === "p10") return statKey;
    return null;
}

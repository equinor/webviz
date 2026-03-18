import { parseSeriesId } from "./seriesId";
import { getSeriesChart, getSeriesIdentifier, getSeriesStatKey, hasSeriesRole } from "./seriesMetadata";

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

export function getConvergenceSeriesStatKey(seriesLike: unknown): ConvergenceStatisticKey | null {
    if (getSeriesChart(seriesLike) === "convergence" && hasSeriesRole(seriesLike, "summary")) {
        const statKey = getSeriesStatKey(seriesLike);
        return isConvergenceStatisticKey(statKey) ? statKey : null;
    }

    const seriesId = getSeriesIdentifier(seriesLike);
    if (!seriesId) return null;

    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.category !== "convergence") return null;

    return isConvergenceStatisticKey(parsed.qualifier) ? parsed.qualifier : null;
}

function isConvergenceStatisticKey(statKey: string | null): statKey is ConvergenceStatisticKey {
    return statKey === "p90" || statKey === "mean" || statKey === "p10";
}

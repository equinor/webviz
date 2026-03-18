import { readSeriesMetadata } from "./seriesMetadata";

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
    const metadata = readSeriesMetadata(seriesLike);
    if (!metadata || metadata.chart !== "convergence" || !metadata.roles.includes("summary")) return null;

    const statKey = metadata.statKey ?? null;
    return isConvergenceStatisticKey(statKey) ? statKey : null;
}

function isConvergenceStatisticKey(statKey: string | null): statKey is ConvergenceStatisticKey {
    return statKey === "p90" || statKey === "mean" || statKey === "p10";
}

import { EnsembleTimestampsStore } from "@framework/EnsembleTimestampsStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function makeTimestampQueryParam(...ensembleIdents: RegularEnsembleIdent[]): { t?: number } {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        return {};
    }

    // Get the ensemble timestamps from the EnsembleTimestampsStore
    const ensembleTimestamps = EnsembleTimestampsStore.getLatestTimestamps(...ensembleIdents);

    // Return the maximum timestamp as a query parameter
    return { t: Math.max(ensembleTimestamps.dataUpdatedAtUtcMs, ensembleTimestamps.caseUpdatedAtUtcMs) };
}

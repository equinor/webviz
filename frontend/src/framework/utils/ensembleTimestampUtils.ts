import type { EnsembleTimestamps_api } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

/**
 * Checks if the ensemble is outdated based on the provided timestamps.
 * Note: if the ensemble doesn't have a timestamp, it's assumed to be outdated
 * @param ensemble The ensemble to check
 * @param timestamp The timestamps to compare against
 * @returns {boolean} True if either timestamp is outdated, false otherwise
 */
export function isEnsembleOutdated(ensemble: RegularEnsemble, timestamp: EnsembleTimestamps_api) {
    const currentTimestamp = ensemble.getTimestamps();
    if (!currentTimestamp) {
        return true;
    }

    const { caseUpdatedAtUtcMs, dataUpdatedAtUtcMs } = currentTimestamp;
    return timestamp.caseUpdatedAtUtcMs > caseUpdatedAtUtcMs || timestamp.dataUpdatedAtUtcMs > dataUpdatedAtUtcMs;
}

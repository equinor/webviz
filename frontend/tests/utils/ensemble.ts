import type { EnsembleTimestamps_api } from "@api";

export function makeEnsembleTimeStamp(): EnsembleTimestamps_api {
    return {
        caseUpdatedAtUtcMs: Date.now(),
        dataUpdatedAtUtcMs: Date.now(),
    };
}

import type { EnsembleTimestamps_api } from "@api";

export function makeEnsembleTimeStamp(): EnsembleTimestamps_api {
    return {
        case_updated_at_utc_ms: Date.now(),
        data_updated_at_utc_ms: Date.now(),
    };
}

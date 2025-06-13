import type { EnsembleTimestamps_api } from "@api";

export function makeEnsembleTimeStamp(): EnsembleTimestamps_api {
    return {
        case_updated_at: new Date().toISOString(),
        data_updated_at: new Date().toISOString(),
    };
}

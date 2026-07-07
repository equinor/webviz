import { usePublishSubscribeTopicValue, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { EnsembleSet } from "./EnsembleSet";
import type { WorkbenchSessionTopicPayloads } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import type { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { UserCreatedItems } from "./UserCreatedItems";

export enum WorkbenchSessionTopic {
    ENSEMBLE_SET = "EnsembleSet",
}

export interface WorkbenchSession extends PublishSubscribe<WorkbenchSessionTopicPayloads> {
    getEnsembleSet: () => EnsembleSet;
    getUserCreatedItems: () => UserCreatedItems;
}

// Keeping the old function for convenience and backwards compatibility - it has to be decided later if it should be removed.
export function useEnsembleSet(workbenchSession: WorkbenchSession): EnsembleSet {
    return usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
}

// The realization filter set now lives on Dashboard (one per dashboard, not one per session) -
// see createEnsembleRealizationFilterFuncForDashboard()/useEnsembleRealizationFilterFunc() in
// @framework/internal/Dashboard. This type stays here since it's still a general-purpose type
// (e.g. used by DataProviderManager's GlobalSettings).
export type EnsembleRealizationFilterFunction = (
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
) => readonly number[];

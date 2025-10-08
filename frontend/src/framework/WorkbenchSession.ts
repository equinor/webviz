import React from "react";

import { usePublishSubscribeTopicValue, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import type { EnsembleSet } from "./EnsembleSet";
import type { WorkbenchSessionTopicPayloads } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import type { RealizationFilterSet } from "./RealizationFilterSet";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { UserCreatedItems } from "./UserCreatedItems";

export enum WorkbenchSessionTopic {
    ENSEMBLE_SET = "EnsembleSet",
    REALIZATION_FILTER_SET = "RealizationFilterSet",
}

export interface WorkbenchSession extends PublishSubscribe<WorkbenchSessionTopicPayloads> {
    getEnsembleSet: () => EnsembleSet;
    getRealizationFilterSet: () => RealizationFilterSet;
    getUserCreatedItems: () => UserCreatedItems;
}

// Keeping the old function for convenience and backwards compatibility - it has to be decided later if it should be removed.
export function useEnsembleSet(workbenchSession: WorkbenchSession): EnsembleSet {
    return usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
}

export function createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession: WorkbenchSession) {
    return function ensembleRealizationFilterFunc(
        ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    ): readonly number[] {
        const realizationFilterSet = workbenchSession.getRealizationFilterSet();
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

        return realizationFilter.getFilteredRealizations();
    };
}

export type EnsembleRealizationFilterFunction = (
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
) => readonly number[];

export function useEnsembleRealizationFilterFunc(
    workbenchSession: WorkbenchSession,
): EnsembleRealizationFilterFunction {
    // With React.useState and filter function `S`, we have `S` = () => readonly number[].
    // For React.useState, initialState (() => S) implies notation () => S, i.e. () => () => readonly number[].
    const [storedEnsembleRealizationFilterFunc, setStoredEnsembleRealizationFilterFunc] =
        React.useState<EnsembleRealizationFilterFunction>(() =>
            createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession),
        );

    React.useEffect(
        function subscribeToEnsembleRealizationFilterSetChanges() {
            function handleEnsembleRealizationFilterSetChanged() {
                setStoredEnsembleRealizationFilterFunc(() =>
                    createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession),
                );
            }

            const unsubscribeFunc = workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSessionTopic.REALIZATION_FILTER_SET)(
                handleEnsembleRealizationFilterSetChanged,
            );
            return unsubscribeFunc;
        },
        [workbenchSession],
    );

    return storedEnsembleRealizationFilterFunc;
}

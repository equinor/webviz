import React from "react";

import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import type { EnsembleSet } from "./EnsembleSet";
import type { RealizationFilterSet } from "./RealizationFilterSet";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { UserCreatedItems } from "./UserCreatedItems";

export enum WorkbenchSessionTopic {
    EnsembleSet = "EnsembleSet",
    RealizationFilterSet = "RealizationFilterSet",
}

export type WorkbenchSessionTopicPayloads = {
    [WorkbenchSessionTopic.EnsembleSet]: EnsembleSet;
    [WorkbenchSessionTopic.RealizationFilterSet]: RealizationFilterSet;
};

export interface WorkbenchSession extends PublishSubscribe<WorkbenchSessionTopicPayloads> {
    getEnsembleSet: () => EnsembleSet;
    getRealizationFilterSet: () => RealizationFilterSet;
    getUserCreatedItems: () => UserCreatedItems;
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
                .makeSubscriberFunction(WorkbenchSessionTopic.RealizationFilterSet)(
                () => handleEnsembleRealizationFilterSetChanged,
            );
            return unsubscribeFunc;
        },
        [workbenchSession],
    );

    return storedEnsembleRealizationFilterFunc;
}

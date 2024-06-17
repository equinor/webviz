import React from "react";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleSet } from "./EnsembleSet";
import { RealizationFilterSet } from "./RealizationFilterSet";
import { UserCreatedItems } from "./UserCreatedItems";

export type EnsembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => readonly number[];

export enum WorkbenchSessionEvent {
    EnsembleSetChanged = "EnsembleSetChanged",
    EnsembleSetLoadingStateChanged = "EnsembleSetLoadingStateChanged",
    RealizationFilterSetChanged = "RealizationFilterSetChanged",
}

export type WorkbenchSessionPayloads = {
    [WorkbenchSessionEvent.EnsembleSetLoadingStateChanged]: {
        isLoading: boolean;
    };
};

export class WorkbenchSession {
    private _subscribersMap: Map<keyof WorkbenchSessionEvent, Set<(payload: any) => void>> = new Map();
    protected _ensembleSet: EnsembleSet = new EnsembleSet([]);
    protected _realizationFilterSet = new RealizationFilterSet();
    protected _userCreatedItems: UserCreatedItems;

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._userCreatedItems = new UserCreatedItems(atomStoreMaster);
    }

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getRealizationFilterSet(): RealizationFilterSet {
        return this._realizationFilterSet;
    }

    getUserCreatedItems(): UserCreatedItems {
        return this._userCreatedItems;
    }

    subscribe<T extends Exclude<WorkbenchSessionEvent, keyof WorkbenchSessionPayloads>>(
        event: T,
        cb: () => void
    ): () => void;
    subscribe<T extends keyof WorkbenchSessionPayloads>(
        event: T,
        cb: (payload: WorkbenchSessionPayloads[T]) => void
    ): () => void;
    subscribe<T extends keyof WorkbenchSessionEvent>(event: T, cb: (payload: any) => void) {
        const subscribersSet = this._subscribersMap.get(event) || new Set();
        subscribersSet.add(cb);
        this._subscribersMap.set(event, subscribersSet);
        return () => {
            subscribersSet.delete(cb);
        };
    }

    protected notifySubscribers<T extends Exclude<WorkbenchSessionEvent, keyof WorkbenchSessionPayloads>>(
        event: T
    ): void;
    protected notifySubscribers<T extends keyof WorkbenchSessionPayloads>(
        event: T,
        payload: WorkbenchSessionPayloads[T]
    ): void;
    protected notifySubscribers<T extends keyof WorkbenchSessionEvent>(event: T, payload?: any): void {
        const subscribersSet = this._subscribersMap.get(event);
        if (!subscribersSet) return;

        for (const callbackFn of subscribersSet) {
            callbackFn(payload);
        }
    }
}

function createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession: WorkbenchSession) {
    return function ensembleRealizationFilterFunc(ensembleIdent: EnsembleIdent): readonly number[] {
        const realizationFilterSet = workbenchSession.getRealizationFilterSet();
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

        return realizationFilter.getFilteredRealizations();
    };
}

export function useEnsembleRealizationFilterFunc(
    workbenchSession: WorkbenchSession
): EnsembleRealizationFilterFunction {
    // With React.useState and filter function `S`, we have `S` = () => readonly number[].
    // For React.useState, initialState (() => S) implies notation () => S, i.e. () => () => readonly number[].
    const [storedEnsembleRealizationFilterFunc, setStoredEnsembleRealizationFilterFunc] =
        React.useState<EnsembleRealizationFilterFunction>(() =>
            createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession)
        );

    React.useEffect(
        function subscribeToEnsembleRealizationFilterSetChanges() {
            function handleEnsembleRealizationFilterSetChanged() {
                setStoredEnsembleRealizationFilterFunc(() =>
                    createEnsembleRealizationFilterFuncForWorkbenchSession(workbenchSession)
                );
            }

            const unsubscribeFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.RealizationFilterSetChanged,
                handleEnsembleRealizationFilterSetChanged
            );
            return unsubscribeFunc;
        },
        [workbenchSession]
    );

    return storedEnsembleRealizationFilterFunc;
}

export function useEnsembleSet(workbenchSession: WorkbenchSession): EnsembleSet {
    const [storedEnsembleSet, setStoredEnsembleSet] = React.useState<EnsembleSet>(workbenchSession.getEnsembleSet());

    React.useEffect(
        function subscribeToEnsembleSetChanges() {
            function handleEnsembleSetChanged() {
                setStoredEnsembleSet(workbenchSession.getEnsembleSet());
            }

            const unsubFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.EnsembleSetChanged,
                handleEnsembleSetChanged
            );
            return unsubFunc;
        },
        [workbenchSession]
    );

    return storedEnsembleSet;
}

export function useFirstEnsembleInEnsembleSet(workbenchSession: WorkbenchSession): Ensemble | null {
    const ensembleSet = useEnsembleSet(workbenchSession);
    if (!ensembleSet.hasAnyEnsembles()) {
        return null;
    }

    return ensembleSet.getEnsembleArr()[0];
}

export function useIsEnsembleSetLoading(workbenchSession: WorkbenchSession): boolean {
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    React.useEffect(
        function subscribeToEnsembleSetLoadingStateChanges() {
            function handleEnsembleSetLoadingStateChanged(
                payload: WorkbenchSessionPayloads[WorkbenchSessionEvent.EnsembleSetLoadingStateChanged]
            ) {
                setIsLoading(payload.isLoading);
            }

            const unsubFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.EnsembleSetLoadingStateChanged,
                handleEnsembleSetLoadingStateChanged
            );
            return unsubFunc;
        },
        [workbenchSession]
    );

    return isLoading;
}

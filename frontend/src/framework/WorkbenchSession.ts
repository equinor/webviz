import React from "react";

import { createStore, useAtom } from "jotai";

import { Ensemble } from "./Ensemble";
import { EnsembleSet } from "./EnsembleSet";
import { EnsembleSetAtom } from "./GlobalAtoms";

export enum WorkbenchSessionEvent {
    EnsembleSetChanged = "EnsembleSetChanged",
    EnsembleSetLoadingStateChanged = "EnsembleSetLoadingStateChanged",
}

export type WorkbenchSessionPayloads = {
    [WorkbenchSessionEvent.EnsembleSetLoadingStateChanged]: {
        isLoading: boolean;
    };
};

export class WorkbenchSession {
    private _subscribersMap: Map<keyof WorkbenchSessionEvent, Set<(payload: any) => void>> = new Map();
    protected _ensembleSet: EnsembleSet = new EnsembleSet([]);
    protected _globalAtomStore: ReturnType<typeof createStore>;

    constructor(globalAtomStore: ReturnType<typeof createStore>) {
        this._globalAtomStore = globalAtomStore;
    }

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getGlobalAtomStore(): ReturnType<typeof createStore> {
        return this._globalAtomStore;
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

export function useEnsembleSetAtom(workbenchSession: WorkbenchSession): EnsembleSet {
    const [ensembleSet] = useAtom(EnsembleSetAtom, { store: workbenchSession.getGlobalAtomStore() });
    return ensembleSet;
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

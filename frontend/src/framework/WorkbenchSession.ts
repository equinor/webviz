import React from "react";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleSet } from "./EnsembleSet";
import { RealizationFilterSet } from "./RealizationFilterSet";

export type EnsembleRealizationFilterFunction = (ensembleIdents: EnsembleIdent) => number[];

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
    // protected _realizationFilterSet = new RealizationFilterSet(this._ensembleSet, []);
    protected _realizationFilterSet = new RealizationFilterSet();

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getRealizationFilterSet(): RealizationFilterSet {
        return this._realizationFilterSet;
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

export function useEnsembleRealizationFilterFunc(
    workbenchSession: WorkbenchSession
): EnsembleRealizationFilterFunction {
    const [storedEnsembleRealizationFilterFunc, setStoredEnsembleRealizationFilterFunc] =
        React.useState<EnsembleRealizationFilterFunction>(() => () => []); // Default to empty filter function

    React.useEffect(
        function subscribeToEnsembleRealizationFilterSetChanges() {
            function handleEnsembleRealizationFilterSetChanged() {
                const ensembleRealizationFilterFunc =
                    () =>
                    (ensembleIdent: EnsembleIdent): number[] => {
                        const realizationFilterSet = workbenchSession.getRealizationFilterSet();
                        const realizationFilter =
                            realizationFilterSet.getRealizationFilterByEnsembleIdent(ensembleIdent);

                        return realizationFilter.getFilteredRealizations();
                    };

                setStoredEnsembleRealizationFilterFunc(ensembleRealizationFilterFunc);
            }

            const unsubFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.RealizationFilterSetChanged,
                handleEnsembleRealizationFilterSetChanged
            );
            return unsubFunc;
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
                // NOTE: HACK!!! Temporary creating a new EnsembleSet instance here just to ensure new reference to trigger re-render.
                // Future: Trigger re-render on change within an ensemble in the ensemble set.
                // setStoredEnsembleSet(new EnsembleSet([...workbenchSession.getEnsembleSet().getEnsembleArr()]));
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

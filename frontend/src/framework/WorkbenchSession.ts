import React from "react";

import { Ensemble } from "./Ensemble";
import { EnsembleSet } from "./EnsembleSet";
import { FieldConfigSet } from "./FieldConfigs";

export enum WorkbenchSessionEvent {
    EnsembleSetChanged = "EnsembleSetChanged",
    EnsembleSetLoadingStateChanged = "EnsembleSetLoadingStateChanged",
    FieldConfigSetChanged = "FieldConfigSetChanged",
    FieldConfigSetLoadingStateChanged = "FieldConfigSetLoadingStateChanged",
}

export type WorkbenchSessionPayloads = {
    [WorkbenchSessionEvent.EnsembleSetLoadingStateChanged]: {
        isLoading: boolean;
    };
    [WorkbenchSessionEvent.FieldConfigSetLoadingStateChanged]: {
        isLoading: boolean;
    };
};

export class WorkbenchSession {
    private _subscribersMap: Map<keyof WorkbenchSessionEvent, Set<(payload: any) => void>> = new Map();
    protected _ensembleSet: EnsembleSet = new EnsembleSet([]);
    protected _fieldConfigSet: FieldConfigSet = new FieldConfigSet([]);

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getFieldConfigSet(): FieldConfigSet {
        return this._fieldConfigSet;
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

export function useFieldConfigSet(workbenchSession: WorkbenchSession): FieldConfigSet {
    const [storedFieldConfigSet, setStoredFieldConfigSet] = React.useState<FieldConfigSet>(
        workbenchSession.getFieldConfigSet()
    );

    React.useEffect(
        function subscribeToFieldConfigSetChanges() {
            function handleFieldConfigSetChanged() {
                setStoredFieldConfigSet(workbenchSession.getFieldConfigSet());
            }

            const unsubFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.FieldConfigSetChanged,
                handleFieldConfigSetChanged
            );
            return unsubFunc;
        },
        [workbenchSession]
    );

    return storedFieldConfigSet;
}

export function useIsFieldConfigSetLoading(workbenchSession: WorkbenchSession): boolean {
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    React.useEffect(
        function subscribeToFieldConfigSetLoadingStateChanges() {
            function handleFieldConfigSetLoadingStateChanged(
                payload: WorkbenchSessionPayloads[WorkbenchSessionEvent.FieldConfigSetLoadingStateChanged]
            ) {
                setIsLoading(payload.isLoading);
            }

            const unsubFunc = workbenchSession.subscribe(
                WorkbenchSessionEvent.FieldConfigSetLoadingStateChanged,
                handleFieldConfigSetLoadingStateChanged
            );
            return unsubFunc;
        },
        [workbenchSession]
    );

    return isLoading;
}

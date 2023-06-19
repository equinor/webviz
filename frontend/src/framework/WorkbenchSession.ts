import React from "react";

import { Ensemble } from "./Ensemble";
import { EnsembleSet } from "./EnsembleSet";

export enum WorkbenchSessionEvent {
    EnsembleSetChanged = "EnsembleSetChanged",
}

export class WorkbenchSession {
    private _subscribersMap: { [eventKey: string]: Set<() => void> };
    protected _ensembleSet: EnsembleSet;

    protected constructor() {
        this._subscribersMap = {};
        this._ensembleSet = new EnsembleSet([]);
    }

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    subscribe(event: WorkbenchSessionEvent, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    protected notifySubscribers(event: WorkbenchSessionEvent): void {
        const subscribersSet = this._subscribersMap[event];
        if (!subscribersSet) return;

        for (const callbackFn of subscribersSet) {
            callbackFn();
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

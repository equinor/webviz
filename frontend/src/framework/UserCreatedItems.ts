import React from "react";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { WorkbenchSession } from "./WorkbenchSession";
import { IntersectionPolylines, IntersectionPolylinesEvent } from "./userCreatedItems/IntersectionPolylines";

export interface UserCreatedItemSet {
    serialize(): string;
    populateFromData(data: string): void;
}

export enum UserCreatedItemsEvent {
    INTERSECTION_POLYLINES_CHANGE = "IntersectionPolylinesChange",
}

export class UserCreatedItems {
    private _intersectionPolylines: IntersectionPolylines;
    private _subscribersMap: Map<UserCreatedItemsEvent, Set<() => void>> = new Map();

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._intersectionPolylines = new IntersectionPolylines(atomStoreMaster);
        this._intersectionPolylines.subscribe(IntersectionPolylinesEvent.CHANGE, () => {
            this.notifySubscribers(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE);
        });
    }

    subscribe(event: UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE, cb: () => void): () => void {
        const subscribersSet = this._subscribersMap.get(event) || new Set();
        subscribersSet.add(cb);
        this._subscribersMap.set(event, subscribersSet);
        return () => {
            subscribersSet.delete(cb);
        };
    }

    private notifySubscribers(event: UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE): void {
        const subscribersSet = this._subscribersMap.get(event);
        if (!subscribersSet) return;

        for (const callbackFn of subscribersSet) {
            callbackFn();
        }
    }

    getIntersectionPolylines(): IntersectionPolylines {
        return this._intersectionPolylines;
    }

    isEqual(other: UserCreatedItems): boolean {
        return this._intersectionPolylines.serialize() === other._intersectionPolylines.serialize();
    }
}

export function useIntersectionPolylines(workbenchSession: WorkbenchSession): IntersectionPolylines {
    const [storedIntersectionPolylines, setStoredIntersectionPolylines] = React.useState<IntersectionPolylines>(
        workbenchSession.getUserCreatedItems().getIntersectionPolylines()
    );

    React.useEffect(() => {
        function handleIntersectionPolylinesChange() {
            setStoredIntersectionPolylines(workbenchSession.getUserCreatedItems().getIntersectionPolylines());
        }
        const unsubscribe = workbenchSession
            .getUserCreatedItems()
            .subscribe(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE, handleIntersectionPolylinesChange);

        return unsubscribe;
    }, [workbenchSession]);

    return storedIntersectionPolylines;
}

import React from "react";

import type { AtomStoreMaster } from "./AtomStoreMaster";
import { IntersectionPolylines, IntersectionPolylinesEvent } from "./userCreatedItems/IntersectionPolylines";
import type { SerializedUserCreatedItemsState } from "./UserCreatedItems.schema";
import type { WorkbenchSession } from "./WorkbenchSession";

export enum UserCreatedItemsEvent {
    INTERSECTION_POLYLINES_CHANGE = "IntersectionPolylinesChange",
    SERIALIZED_STATE = "SerializedState",
}

export class UserCreatedItems {
    private _intersectionPolylines: IntersectionPolylines;
    private _subscribersMap: Map<UserCreatedItemsEvent, Set<() => void>> = new Map();

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._intersectionPolylines = new IntersectionPolylines(atomStoreMaster);
        this._intersectionPolylines.subscribe(IntersectionPolylinesEvent.CHANGE, () => {
            this.notifySubscribers(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE);
            this.notifySubscribers(UserCreatedItemsEvent.SERIALIZED_STATE);
        });
    }

    serializeState(): SerializedUserCreatedItemsState {
        return {
            intersectionPolylines: this._intersectionPolylines.serializeState(),
        };
    }

    deserializeState(serializedState: SerializedUserCreatedItemsState): void {
        this._intersectionPolylines.deserializeState(serializedState.intersectionPolylines);
    }

    subscribe(event: UserCreatedItemsEvent, cb: () => void): () => void {
        const subscribersSet = this._subscribersMap.get(event) || new Set();
        subscribersSet.add(cb);
        this._subscribersMap.set(event, subscribersSet);
        return () => {
            subscribersSet.delete(cb);
        };
    }

    private notifySubscribers(event: UserCreatedItemsEvent): void {
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
        return this._intersectionPolylines.serializeState() === other._intersectionPolylines.serializeState();
    }
}

export function useIntersectionPolylines(workbenchSession: WorkbenchSession): IntersectionPolylines {
    const [storedIntersectionPolylines, setStoredIntersectionPolylines] = React.useState<IntersectionPolylines>(
        workbenchSession.getUserCreatedItems().getIntersectionPolylines(),
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

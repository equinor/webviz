import React from "react";

import type { AtomStoreMaster } from "./AtomStoreMaster";
import {
    INTERSECTION_POLYLINES_JTD_SCHEMA,
    IntersectionPolylines,
    IntersectionPolylinesEvent,
    type SerializedIntersectionPolylines,
} from "./userCreatedItems/IntersectionPolylines";
import type { WorkbenchSession } from "./WorkbenchSession";
import type { JTDSchemaType } from "ajv/dist/core";

export type SerializedUserCreatedItems = {
    intersectionPolylines: SerializedIntersectionPolylines;
};

export enum UserCreatedItemsEvent {
    INTERSECTION_POLYLINES_CHANGE = "IntersectionPolylinesChange",
}

export const USER_CREATED_ITEMS_JTD_SCHEMA: JTDSchemaType<SerializedUserCreatedItems> = {
    properties: {
        intersectionPolylines: INTERSECTION_POLYLINES_JTD_SCHEMA,
    },
} as const;

export class UserCreatedItems {
    private _intersectionPolylines: IntersectionPolylines;
    private _subscribersMap: Map<UserCreatedItemsEvent, Set<() => void>> = new Map();

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._intersectionPolylines = new IntersectionPolylines(atomStoreMaster);
        this._intersectionPolylines.subscribe(IntersectionPolylinesEvent.CHANGE, () => {
            this.notifySubscribers(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE);
        });
    }

    serializeState(): SerializedUserCreatedItems {
        return {
            intersectionPolylines: this._intersectionPolylines.serializeState(),
        };
    }

    deserializeState(serializedState: SerializedUserCreatedItems): void {
        this._intersectionPolylines.deserializeState(serializedState.intersectionPolylines);
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

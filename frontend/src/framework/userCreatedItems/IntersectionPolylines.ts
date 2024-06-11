import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { UserCreatedItemSet } from "@framework/UserCreatedItems";

import { atom } from "jotai";
import { v4 } from "uuid";

export type IntersectionPolyline = {
    id: string;
    name: string;
    points: number[][];
};

export type IntersectionPolylineWithoutId = Omit<IntersectionPolyline, "id">;

export enum IntersectionPolylinesEvent {
    CHANGE = "IntersectionPolylinesChange",
}

export class IntersectionPolylines implements UserCreatedItemSet {
    private _atomStoreMaster: AtomStoreMaster;
    private _polylines: IntersectionPolyline[] = [];
    private _subscribersMap: Map<IntersectionPolylinesEvent, Set<() => void>> = new Map();

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._atomStoreMaster = atomStoreMaster;
    }

    serialize(): string {
        return JSON.stringify(this._polylines);
    }

    populateFromData(data: string): void {
        this._polylines = JSON.parse(data);
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);
    }

    /*
        Adds a new polyline to the set of polylines and returns the id of the newly added polyline.
    */
    add(polyline: IntersectionPolylineWithoutId): string {
        const id = v4();
        this._polylines.push({
            id,
            ...polyline,
        });
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);

        return id;
    }

    remove(id: string): void {
        this._polylines = this._polylines.filter((polyline) => polyline.id !== id);
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);
    }

    getPolylines(): IntersectionPolyline[] {
        return this._polylines;
    }

    getPolyline(id: string): IntersectionPolyline | undefined {
        return this._polylines.find((polyline) => polyline.id === id);
    }

    updatePolyline(id: string, polyline: IntersectionPolylineWithoutId): void {
        const index = this._polylines.findIndex((polyline) => polyline.id === id);
        this._polylines[index] = {
            id,
            ...polyline,
        };
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);
    }

    subscribe(event: IntersectionPolylinesEvent, cb: () => void): () => void {
        const subscribersSet = this._subscribersMap.get(event) || new Set();
        subscribersSet.add(cb);
        this._subscribersMap.set(event, subscribersSet);
        return () => {
            subscribersSet.delete(cb);
        };
    }

    private notifySubscribers(event: IntersectionPolylinesEvent): void {
        const subscribersSet = this._subscribersMap.get(event);
        if (!subscribersSet) return;

        for (const callbackFn of subscribersSet) {
            callbackFn();
        }

        this._atomStoreMaster.setAtomValue(IntersectionPolylinesAtom, this._polylines);
    }
}

export const IntersectionPolylinesAtom = atom<IntersectionPolyline[]>([]);

import { atom } from "jotai";
import { cloneDeep, isEqual } from "lodash";
import { v4 } from "uuid";

import type { AtomStoreMaster } from "@framework/AtomStoreMaster";

import type { SerializedIntersectionPolylinesState } from "./IntersectionPolylines.schema";

export type IntersectionPolyline = {
    id: string;
    name: string;
    color: string;
    path: number[][];
    fieldId: string;
};

export type IntersectionPolylineWithoutId = Omit<IntersectionPolyline, "id">;

export enum IntersectionPolylinesEvent {
    CHANGE = "IntersectionPolylinesChange",
}

export class IntersectionPolylines {
    private _atomStoreMaster: AtomStoreMaster;
    private _polylines: IntersectionPolyline[] = [];
    private _subscribersMap: Map<IntersectionPolylinesEvent, Set<() => void>> = new Map();

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._atomStoreMaster = atomStoreMaster;
    }

    serializeState(): SerializedIntersectionPolylinesState {
        return {
            intersectionPolylines: this._polylines,
        };
    }

    deserializeState(data: SerializedIntersectionPolylinesState): void {
        this._polylines = data.intersectionPolylines.map((polyline) => ({
            ...polyline,
        }));
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

    setPolylines(polylines: IntersectionPolyline[]): void {
        if (isEqual(this._polylines, polylines)) {
            return;
        }
        this._polylines = [...polylines];
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);
    }

    getPolylines(): readonly IntersectionPolyline[] {
        return this._polylines;
    }

    getPolyline(id: string): IntersectionPolyline | undefined {
        return this._polylines.find((polyline) => polyline.id === id);
    }

    updatePolyline(id: string, polyline: IntersectionPolylineWithoutId): void {
        // Creating a new array to avoid mutation wrt reference checks
        const newPolylinesArray: IntersectionPolyline[] = [...this._polylines];
        const index = newPolylinesArray.findIndex((polyline) => polyline.id === id);
        newPolylinesArray[index] = {
            id,
            ...polyline,
        };
        this._polylines = newPolylinesArray;
        this.notifySubscribers(IntersectionPolylinesEvent.CHANGE);
    }

    updatePolylines(polylines: IntersectionPolyline[]): void {
        // Creating a new array to avoid mutation wrt reference checks
        const newPolylinesArray: IntersectionPolyline[] = [...this._polylines];
        for (const updatedPolyline of polylines) {
            const index = newPolylinesArray.findIndex((p) => p.id === updatedPolyline.id);
            if (index === -1) {
                // New polyline, add it
                newPolylinesArray.push(updatedPolyline);
            } else {
                // Existing polyline, update it
                newPolylinesArray[index] = { ...updatedPolyline };
            }
        }
        this._polylines = newPolylinesArray;
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
        this._atomStoreMaster.setAtomValue(IntersectionPolylinesAtom, cloneDeep(this._polylines));

        const subscribersSet = this._subscribersMap.get(event);
        if (!subscribersSet) return;

        for (const callbackFn of subscribersSet) {
            callbackFn();
        }
    }
}

export const IntersectionPolylinesAtom = atom<IntersectionPolyline[]>([]);

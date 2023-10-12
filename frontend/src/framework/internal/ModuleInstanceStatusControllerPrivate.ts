import React from "react";

import {
    ModuleInstanceStatusController,
    StatusControllerState,
    StatusSource,
} from "@framework/ModuleInstanceStatusController";

import { filter, isEqual, keys } from "lodash";

export class ModuleInstanceStatusControllerPrivate extends ModuleInstanceStatusController {
    private _subscribers: Map<keyof StatusControllerState, Set<() => void>>;

    constructor() {
        super();
        this._subscribers = new Map();
    }

    clearMessages(source: StatusSource): void {
        super.clearMessages(source);
    }

    reviseState(): void {
        const differentStateKeys = filter(keys(this._stateCandidates), (key: keyof StatusControllerState) => {
            return !isEqual(this._state[key], this._stateCandidates[key]);
        }) as (keyof StatusControllerState)[];

        super.reviseState();

        differentStateKeys.forEach((stateKey) => {
            this.notifySubscribers(stateKey);
        });
    }

    private notifySubscribers(stateKey: keyof StatusControllerState): void {
        const subscribers = this._subscribers.get(stateKey);
        if (subscribers) {
            subscribers.forEach((subscriber) => {
                subscriber();
            });
        }
    }

    makeSnapshotGetter<T extends keyof StatusControllerState>(stateKey: T): () => StatusControllerState[T] {
        const snapshotGetter = (): any => {
            return this._state[stateKey];
        };

        return snapshotGetter;
    }

    makeSubscriberFunction<T extends keyof StatusControllerState>(
        stateKey: T
    ): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(stateKey) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(stateKey, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }
}

export function useStatusControllerValue<T extends keyof StatusControllerState>(
    statusController: ModuleInstanceStatusControllerPrivate,
    stateKey: T
): StatusControllerState[T] {
    const value = React.useSyncExternalStore<StatusControllerState[T]>(
        statusController.makeSubscriberFunction(stateKey),
        statusController.makeSnapshotGetter(stateKey)
    );

    return value;
}

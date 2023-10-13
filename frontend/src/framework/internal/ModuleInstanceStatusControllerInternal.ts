import React from "react";

import {
    ModuleInstanceStatusController,
    StatusMessageType,
    StatusSource,
} from "@framework/ModuleInstanceStatusController";

import { cloneDeep, filter, isEqual, keys } from "lodash";

type StatusMessage = {
    source: StatusSource;
    message: string;
    type: StatusMessageType;
};

type StatusControllerState = {
    messages: StatusMessage[];
    loading: boolean;
    viewDebugMessage: string;
    settingsDebugMessage: string;
    viewRenderCount: number | null;
    settingsRenderCount: number | null;
};

export class ModuleInstanceStatusControllerInternal implements ModuleInstanceStatusController {
    protected _stateCandidates: StatusControllerState;
    protected _state: StatusControllerState = {
        messages: [],
        loading: false,
        viewDebugMessage: "",
        settingsDebugMessage: "",
        viewRenderCount: null,
        settingsRenderCount: null,
    };
    private _subscribers: Map<keyof StatusControllerState, Set<() => void>> = new Map();

    constructor() {
        this._stateCandidates = cloneDeep(this._state);
    }

    addMessage(source: StatusSource, message: string, type: StatusMessageType): void {
        this._stateCandidates.messages.push({
            source,
            message,
            type,
        });
    }

    clearMessages(source: StatusSource): void {
        this._stateCandidates.messages = this._stateCandidates.messages.filter((msg) => msg.source !== source);
    }

    setLoading(isLoading: boolean): void {
        this._stateCandidates.loading = isLoading;
    }

    setDebugMessage(source: StatusSource, message: string): void {
        if (source === StatusSource.View) {
            this._stateCandidates.viewDebugMessage = message;
        }
        if (source === StatusSource.Settings) {
            this._stateCandidates.settingsDebugMessage = message;
        }
    }

    incrementReportedComponentRenderCount(source: StatusSource): void {
        if (source === StatusSource.View) {
            if (this._stateCandidates.viewRenderCount === null) {
                this._stateCandidates.viewRenderCount = 0;
            }
            this._stateCandidates.viewRenderCount++;
        }
        if (source === StatusSource.Settings) {
            if (this._stateCandidates.settingsRenderCount === null) {
                this._stateCandidates.settingsRenderCount = 0;
            }
            this._stateCandidates.settingsRenderCount++;
        }
    }

    reviseAndPublishState(): void {
        const differentStateKeys = filter(keys(this._stateCandidates), (key: keyof StatusControllerState) => {
            return !isEqual(this._state[key], this._stateCandidates[key]);
        }) as (keyof StatusControllerState)[];

        this._state = cloneDeep(this._stateCandidates);

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

export function useStatusControllerStateValue<T extends keyof StatusControllerState>(
    statusController: ModuleInstanceStatusControllerInternal,
    stateKey: T
): StatusControllerState[T] {
    const value = React.useSyncExternalStore<StatusControllerState[T]>(
        statusController.makeSubscriberFunction(stateKey),
        statusController.makeSnapshotGetter(stateKey)
    );

    return value;
}

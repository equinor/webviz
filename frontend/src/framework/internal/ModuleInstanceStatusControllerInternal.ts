import React from "react";

import {
    ModuleInstanceStatusController,
    StatusMessageType,
    StatusSource,
} from "@framework/ModuleInstanceStatusController";

import { cloneDeep, filter, isEqual, keys } from "lodash";
import { v4 } from "uuid";

type StatusMessage = {
    source: StatusSource;
    message: string;
    type: StatusMessageType;
    datetimeMs: number;
};

export enum LogEntryType {
    LOADING_DONE = "loading_done",
    LOADING = "loading",
    SUCCESS = "success",
    MESSAGE = "message",
}

export type LogEntry = {
    id: string;
    datetimeMs: number;
} & (
    | {
          type: LogEntryType.LOADING;
      }
    | {
          type: LogEntryType.LOADING_DONE;
      }
    | {
          type: LogEntryType.SUCCESS;
      }
    | {
          type: LogEntryType.MESSAGE;
          message: StatusMessage;
          repetitions?: number;
      }
);

type StatusControllerState = {
    hotMessageCache: StatusMessage[];
    log: LogEntry[];
    loading: boolean;
    viewDebugMessage: string;
    settingsDebugMessage: string;
    viewRenderCount: number | null;
    settingsRenderCount: number | null;
};

export class ModuleInstanceStatusControllerInternal implements ModuleInstanceStatusController {
    protected _stateCandidates: StatusControllerState;
    protected _state: StatusControllerState = {
        hotMessageCache: [],
        log: [],
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
        this._stateCandidates.hotMessageCache.push({
            source,
            message,
            type,
            datetimeMs: Date.now(),
        });
    }

    clearHotMessageCache(source: StatusSource): void {
        this._stateCandidates.hotMessageCache = this._stateCandidates.hotMessageCache.filter(
            (msg) => msg.source !== source
        );
    }

    private areMessagesEqual(msg1: StatusMessage, msg2: StatusMessage): boolean {
        if (msg1.message !== msg2.message || msg1.type !== msg2.type) {
            return false;
        }

        return true;
    }

    private transferHotMessagesToLog(): void {
        const messagesToBeTransferred = this._stateCandidates.hotMessageCache;

        if (this._stateCandidates.loading) {
            return;
        }
        for (const [index, message] of messagesToBeTransferred.entries()) {
            const potentialDuplicateMessage = this._stateCandidates.log[index];
            if (
                potentialDuplicateMessage &&
                potentialDuplicateMessage.type === LogEntryType.MESSAGE &&
                this.areMessagesEqual(potentialDuplicateMessage.message, message)
            ) {
                potentialDuplicateMessage.repetitions = (potentialDuplicateMessage.repetitions || 1) + 1;
                continue;
            }
            this._stateCandidates.log.unshift(
                ...messagesToBeTransferred.map((message) => ({
                    type: LogEntryType.MESSAGE,
                    message: message,
                    datetimeMs: Date.now(),
                    id: v4(),
                }))
            );
            break;
        }
    }

    private maybeLogSuccess() {
        let storeSuccess = false;

        if (this._stateCandidates.log.length > 0 && this._stateCandidates.log[0].type === LogEntryType.LOADING_DONE) {
            storeSuccess = true;
        }

        if (!storeSuccess) {
            return;
        }

        this._stateCandidates.log.unshift({
            type: LogEntryType.SUCCESS,
            datetimeMs: Date.now(),
            id: v4(),
        });
    }

    clearLog(): void {
        this._state.log = [];
        this._stateCandidates.log = [];
        this.notifySubscribers("log");
    }

    setLoading(isLoading: boolean): void {
        this._stateCandidates.loading = isLoading;
        if (isLoading) {
            if (this._stateCandidates.log.length === 0 || this._stateCandidates.log[0].type !== LogEntryType.LOADING) {
                this._stateCandidates.log.unshift({
                    type: LogEntryType.LOADING,
                    datetimeMs: Date.now(),
                    id: v4(),
                });
            }
        } else {
            for (const [index, logEntry] of this._stateCandidates.log.entries()) {
                if (logEntry.type === LogEntryType.LOADING_DONE) {
                    break;
                }
                if (logEntry.type === LogEntryType.LOADING) {
                    this._stateCandidates.log.splice(index, 0, {
                        type: LogEntryType.LOADING_DONE,
                        datetimeMs: Date.now(),
                        id: v4(),
                    });
                    break;
                }
            }
        }
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
        this.transferHotMessagesToLog();
        this.maybeLogSuccess();

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

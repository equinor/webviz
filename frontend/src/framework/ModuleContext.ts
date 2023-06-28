import React from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannel } from "./Broadcaster";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

type StringTypeToRealType<T> = T extends "string"
    ? string
    : T extends "number"
    ? number
    : T extends "boolean"
    ? boolean
    : T extends "object"
    ? object
    : T extends "array"
    ? any[]
    : never;

export class ModuleContext<S extends StateBaseType> {
    private _moduleInstance: ModuleInstance<S>;
    private _stateStore: StateStore<S>;

    constructor(moduleInstance: ModuleInstance<S>, stateStore: StateStore<S>) {
        this._moduleInstance = moduleInstance;
        this._stateStore = stateStore;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    getStateStore(): StateStore<S> {
        return this._stateStore;
    }

    useStoreState<K extends keyof S>(key: K): [S[K], (value: S[K] | ((prev: S[K]) => S[K])) => void] {
        return useStoreState(this._stateStore, key);
    }

    useStoreValue<K extends keyof S>(key: K): S[K] {
        return useStoreValue(this._stateStore, key);
    }

    useSetStoreValue<K extends keyof S>(key: K): (newValue: S[K] | ((prev: S[K]) => S[K])) => void {
        return useSetStoreValue(this._stateStore, key);
    }

    useSyncedSettingKeys(): SyncSettingKey[] {
        const [keyArr, setKeyArr] = React.useState<SyncSettingKey[]>([]);

        React.useEffect(() => {
            function handleNewValue(newArr: SyncSettingKey[]) {
                setKeyArr([...newArr]);
            }

            const unsubscribeFunc = this._moduleInstance.subscribeToSyncedSettingKeysChange(handleNewValue);
            return unsubscribeFunc;
        }, []);

        return keyArr;
    }

    getChannel(channelName: string): BroadcastChannel {
        return this._moduleInstance.getBroadcastChannel(channelName);
    }

    setInstanceTitle(title: string): void {
        this._moduleInstance.setTitle(title);
    }
}

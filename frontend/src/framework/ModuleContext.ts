import React from "react";

import { BroadcastChannel, InputChannel } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

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

    setInstanceTitle(title: string): void {
        this._moduleInstance.setTitle(title);
    }

    getStatusController(): ModuleInstanceStatusController {
        return this._moduleInstance.getStatusController();
    }

    getChannel(channelName: string): BroadcastChannel {
        return this._moduleInstance.getBroadcastChannel(channelName);
    }

    getInputChannel(name: string): BroadcastChannel | null {
        return this._moduleInstance.getInputChannel(name);
    }

    setInputChannel(inputName: string, channelName: string): void {
        this._moduleInstance.setInputChannel(inputName, channelName);
    }

    getInputChannelDef(name: string): InputChannel | undefined {
        return this._moduleInstance.getInputChannelDefs().find((channelDef) => channelDef.name === name);
    }

    useInputChannel(name: string, initialSettings?: InitialSettings): BroadcastChannel | null {
        const [channel, setChannel] = React.useState<BroadcastChannel | null>(null);

        React.useEffect(() => {
            if (initialSettings) {
                const setting = initialSettings.get(name, "string");
                if (setting) {
                    this._moduleInstance.setInputChannel(name, setting);
                }
            }
        }, [initialSettings]);

        React.useEffect(() => {
            function handleNewChannel(newChannel: BroadcastChannel | null) {
                setChannel(newChannel);
            }

            const unsubscribeFunc = this._moduleInstance.subscribeToInputChannelChange(name, handleNewChannel);
            return unsubscribeFunc;
        }, [name]);

        return channel;
    }
}

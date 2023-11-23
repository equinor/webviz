import React from "react";

import { BroadcastChannel, InputBroadcastChannelDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { Content, Program, Type, TypeToTSTypeMapping, useBroadcast, useChannelListener } from "./NewBroadcaster";
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

    getInputChannelDef(name: string): InputBroadcastChannelDef | undefined {
        return this._moduleInstance.getInputChannelDefs().find((channelDef) => channelDef.name === name);
    }

    useChannelListener<TContentValueType extends Type>(options: {
        listenerIdent: string;
        expectedValueType: TContentValueType;
        initialSettings?: InitialSettings;
    }): {
        ident: string;
        name: string;
        channel: {
            ident: string;
            name: string;
            moduleInstanceId: string;
            programs: { ident: string; name: string; content: Content<TypeToTSTypeMapping[TContentValueType]>[] }[];
        };
        listening: boolean;
    } {
        const listener = this._moduleInstance.getBroadcaster().getListener(options.listenerIdent);

        React.useEffect(() => {
            if (options.initialSettings) {
                const setting = options.initialSettings.get(options.listenerIdent, "string");
                if (setting && listener) {
                    const channel = this._moduleInstance.getBroadcaster().getChannel(setting);
                    if (!channel) {
                        return;
                    }
                    listener.startListeningTo(
                        channel,
                        channel.getPrograms().map((el) => el.getName())
                    );
                }
            }
        }, [options.initialSettings, listener]);

        return useChannelListener<TContentValueType>({
            channelListener: this._moduleInstance.getBroadcaster().getListener(options.listenerIdent),
            expectedValueType: options.expectedValueType,
        });
    }

    useBroadcast(options: {
        channelIdent: string;
        dependencies: any[];
        programs: Program[];
        contentGenerator: (programIdent: string) => Content[];
    }) {
        const channel = this._moduleInstance.getBroadcaster().getChannel(options.channelIdent);
        if (!channel) {
            throw new Error(`Channel '${options.channelIdent}' does not exist`);
        }
        return useBroadcast({
            channel,
            ...options,
        });
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

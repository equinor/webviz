import React from "react";

import { DataElement, KeyKind, KeyType, ModuleChannelContentDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { useChannelReceiver } from "./internal/DataChannels/hooks/useChannelReceiver";
import { usePublishChannelContents } from "./internal/DataChannels/hooks/usePublishChannelContents";

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

    useChannelReceiver<TKeyKinds extends KeyKind[]>(options: {
        idString: string;
        expectedKindsOfKeys: TKeyKinds;
        initialSettings?: InitialSettings;
    }): ReturnType<typeof useChannelReceiver<(typeof options)["expectedKindsOfKeys"]>> {
        const receiver = this._moduleInstance.getChannelManager().getReceiver(options.idString);

        React.useEffect(() => {
            if (options.initialSettings) {
                const setting = options.initialSettings.get(options.idString, "string");
                if (setting && receiver) {
                    const channel = this._moduleInstance.getChannelManager().getChannel(setting as any);
                    if (!channel) {
                        return;
                    }
                    receiver.subscribeToChannel(channel, "All");
                }
            }
        }, [options.initialSettings, receiver]);

        return useChannelReceiver({
            receiver: this._moduleInstance.getChannelManager().getReceiver(options.idString),
            expectedKindsOfKeys: options.expectedKindsOfKeys,
        });
    }

    usePublishChannelContents(options: {
        channelIdString: string;
        dependencies: any[];
        contents: ModuleChannelContentDefinition[];
        dataGenerator: (contentIdString: string) => {
            data: DataElement<KeyType>[];
            metaData?: Record<string, string | number>;
        };
    }) {
        const channel = this._moduleInstance.getChannelManager().getChannel(options.channelIdString);
        if (!channel) {
            throw new Error(`Channel '${options.channelIdString}' does not exist`);
        }
        return usePublishChannelContents({
            channel,
            ...options,
        });
    }
}

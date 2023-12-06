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
        subscriberIdent: string;
        expectedKeyKinds: TKeyKinds;
        initialSettings?: InitialSettings;
    }): ReturnType<typeof useChannelReceiver<(typeof options)["expectedKeyKinds"]>> {
        const subscriber = this._moduleInstance.getPublishSubscribeBroker().getReceiver(options.subscriberIdent);

        React.useEffect(() => {
            if (options.initialSettings) {
                const setting = options.initialSettings.get(options.subscriberIdent, "string");
                if (setting && subscriber) {
                    const channel = this._moduleInstance.getPublishSubscribeBroker().getChannel(setting as any);
                    if (!channel) {
                        return;
                    }
                    subscriber.subscribeToChannel(channel, "All");
                }
            }
        }, [options.initialSettings, subscriber]);

        return useChannelReceiver({
            subscriber: this._moduleInstance.getPublishSubscribeBroker().getReceiver(options.subscriberIdent),
            expectedKeyKinds: options.expectedKeyKinds,
        });
    }

    usePublishChannelContents(options: {
        channelIdString: string;
        dependencies: any[];
        contents: ModuleChannelContentDefinition[];
        dataGenerator: (contentIdent: string) => {
            data: DataElement<KeyType>[];
            metaData?: Record<string, string | number>;
        };
    }) {
        const channel = this._moduleInstance.getPublishSubscribeBroker().getChannel(options.channelIdString);
        if (!channel) {
            throw new Error(`Channel '${options.channelIdString}' does not exist`);
        }
        return usePublishChannelContents({
            channel,
            ...options,
        });
    }
}

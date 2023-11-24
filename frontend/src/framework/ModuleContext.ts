import React from "react";

import { ContentDefinition, Data, DataType, Type, TypeToTSTypeMapping } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { usePublish } from "./internal/DataChannels/hooks/usePublish";
import { useSubscriber } from "./internal/DataChannels/hooks/useSubscriber";

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

    useSubscriber<TContentValueType extends Type>(options: {
        subscriberIdent: string;
        expectedValueType: TContentValueType;
        initialSettings?: InitialSettings;
    }): ReturnType<typeof useSubscriber<TContentValueType>> {
        const subscriber = this._moduleInstance.getPublishSubscribeBroker().getSubscriber(options.subscriberIdent);

        React.useEffect(() => {
            if (options.initialSettings) {
                const setting = options.initialSettings.get(options.subscriberIdent, "string");
                if (setting && subscriber) {
                    const channel = this._moduleInstance.getPublishSubscribeBroker().getChannel(setting);
                    if (!channel) {
                        return;
                    }
                    subscriber.subscribeToChannel(channel, "All");
                }
            }
        }, [options.initialSettings, subscriber]);

        return useSubscriber<TContentValueType>({
            subscriber: this._moduleInstance.getPublishSubscribeBroker().getSubscriber(options.subscriberIdent),
            expectedValueType: options.expectedValueType,
        });
    }

    usePublish(options: {
        channelIdent: string;
        dependencies: any[];
        contents: ContentDefinition[];
        dataGenerator: (
            contentIdent: string
        ) => Data[] | { data: Data[]; metaData: Record<string, DataType> | undefined };
    }) {
        const channel = this._moduleInstance.getPublishSubscribeBroker().getChannel(options.channelIdent);
        if (!channel) {
            throw new Error(`Channel '${options.channelIdent}' does not exist`);
        }
        return usePublish({
            channel,
            ...options,
        });
    }
}

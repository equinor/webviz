import React from "react";

import {
    ChannelDefinitions,
    ContentDefinition,
    Data,
    GenreType,
    SubscriberDefinitions,
    Type,
} from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { usePublish } from "./internal/DataChannels/hooks/usePublish";
import { useSubscriber } from "./internal/DataChannels/hooks/useSubscriber";

export class ModuleContext<
    S extends StateBaseType,
    TChannelDefs extends ChannelDefinitions,
    TSubscriberDefs extends SubscriberDefinitions
> {
    private _moduleInstance: ModuleInstance<S, TChannelDefs, TSubscriberDefs>;
    private _stateStore: StateStore<S>;

    constructor(moduleInstance: ModuleInstance<S, TChannelDefs, TSubscriberDefs>, stateStore: StateStore<S>) {
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

    useSubscriber<TIdent extends Extract<keyof TSubscriberDefs, string>, TContentValueType extends Type>(options: {
        subscriberIdent: TIdent;
        expectedValueType: TContentValueType;
        initialSettings?: InitialSettings;
    }): ReturnType<typeof useSubscriber<TSubscriberDefs[TIdent]["supportedGenres"], TContentValueType>> {
        const subscriber = this._moduleInstance.getPublishSubscribeBroker().getSubscriber(options.subscriberIdent);

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

        return useSubscriber<TSubscriberDefs[TIdent]["supportedGenres"], TContentValueType>({
            subscriber: this._moduleInstance.getPublishSubscribeBroker().getSubscriber(options.subscriberIdent),
            expectedValueType: options.expectedValueType,
        });
    }

    usePublish<TIdent extends Extract<keyof TChannelDefs, string>>(options: {
        channelIdent: TIdent;
        dependencies: any[];
        contents: ContentDefinition[];
        dataGenerator: (contentIdent: string) => TChannelDefs[TIdent]["metaData"] extends undefined
            ? Data<GenreType[TChannelDefs[TIdent]["genre"]], TChannelDefs[TIdent]["dataType"]>[]
            : {
                  data: Data<GenreType[TChannelDefs[TIdent]["genre"]], TChannelDefs[TIdent]["dataType"]>[];
                  metaData: TChannelDefs[TIdent]["metaData"];
              };
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

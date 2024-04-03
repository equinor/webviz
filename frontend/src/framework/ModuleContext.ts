/**
 * Why are we disbling rules-of-hooks here?
 *
 * Well, we are using several hooks in this class, which is not allowed by this rule.
 * However, we are not using these hooks in a component, but in a utility class.
 * The important thing to remember is that these functions must be called on every render,
 * unconditionally (i.e. not in a conditional statement) and not in a loop.
 * This is exactly what we are doing here. We are only using the class to group the functions together
 * and give additional context to the functions.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";

import { ChannelContentDefinition, KeyKind } from "./DataChannelTypes";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceBaseType,
    useSetSettingsToViewInterfaceValue,
    useSettingsToViewInterfaceState,
    useSettingsToViewInterfaceValue,
} from "./UniDirectionalSettingsToViewInterface";
import { useChannelReceiver } from "./internal/DataChannels/hooks/useChannelReceiver";
import { usePublishChannelContents } from "./internal/DataChannels/hooks/usePublishChannelContents";

export class ModuleContext<TStateType extends StateBaseType, TInterfaceType extends InterfaceBaseType> {
    protected _moduleInstance: ModuleInstance<TStateType, TInterfaceType>;
    private _stateStore: StateStore<TStateType>;

    constructor(moduleInstance: ModuleInstance<TStateType, TInterfaceType>, stateStore: StateStore<TStateType>) {
        this._moduleInstance = moduleInstance;
        this._stateStore = stateStore;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    getStateStore(): StateStore<TStateType> {
        return this._stateStore;
    }

    useStoreState<K extends keyof TStateType>(
        key: K
    ): [TStateType[K], (value: TStateType[K] | ((prev: TStateType[K]) => TStateType[K])) => void] {
        return useStoreState(this._stateStore, key);
    }

    useStoreValue<K extends keyof TStateType>(key: K): TStateType[K] {
        return useStoreValue(this._stateStore, key);
    }

    useSetStoreValue<K extends keyof TStateType>(
        key: K
    ): (newValue: TStateType[K] | ((prev: TStateType[K]) => TStateType[K])) => void {
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
        receiverIdString: string;
        expectedKindsOfKeys: TKeyKinds;
    }): ReturnType<typeof useChannelReceiver<(typeof options)["expectedKindsOfKeys"]>> {
        const receiver = this._moduleInstance.getChannelManager().getReceiver(options.receiverIdString);

        if (!receiver) {
            throw new Error(`Receiver '${options.receiverIdString}' does not exist`);
        }

        return useChannelReceiver(receiver, options.expectedKindsOfKeys);
    }

    usePublishChannelContents(options: {
        channelIdString: string;
        dependencies: any[];
        enabled?: boolean;
        contents: ChannelContentDefinition[];
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

    useSettingsToViewInterfaceState<TKey extends keyof TInterfaceType["baseStates"]>(
        key: TKey
    ): [Awaited<TInterfaceType["baseStates"][TKey]>, (value: TInterfaceType["baseStates"][TKey]) => void] {
        return useSettingsToViewInterfaceState(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }

    useSettingsToViewInterfaceValue<TKey extends keyof TInterfaceType["baseStates"]>(
        key: TKey
    ): TInterfaceType["baseStates"][TKey];
    useSettingsToViewInterfaceValue<TKey extends keyof TInterfaceType["derivedStates"]>(
        key: TKey
    ): TInterfaceType["derivedStates"][TKey];
    useSettingsToViewInterfaceValue<
        TKey extends keyof (TInterfaceType["baseStates"] | TInterfaceType["derivedStates"])
    >(key: TKey): TInterfaceType["baseStates"][TKey] | TInterfaceType["derivedStates"][TKey] {
        return useSettingsToViewInterfaceValue(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }

    useSetSettingsToViewInterfaceValue<TKey extends keyof TInterfaceType["baseStates"]>(
        key: TKey
    ): (value: TInterfaceType["baseStates"][TKey]) => void {
        return useSetSettingsToViewInterfaceValue(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }
}

export type ViewContext<StateType extends StateBaseType, TInterfaceType extends InterfaceBaseType> = Omit<
    ModuleContext<StateType, TInterfaceType>,
    "useInterfaceState" | "useSetInterfaceValue"
>;

export type SettingsContext<StateType extends StateBaseType, TInterfaceType extends InterfaceBaseType> = ModuleContext<
    StateType,
    TInterfaceType
>;

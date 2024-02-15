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
    useInterfaceState,
    useInterfaceValue,
    useSetInterfaceValue,
} from "./UniDirectionalSettingsToViewInterface";
import { useChannelReceiver } from "./internal/DataChannels/hooks/useChannelReceiver";
import { usePublishChannelContents } from "./internal/DataChannels/hooks/usePublishChannelContents";

export class ModuleContext<S extends StateBaseType, TInterfaceType extends InterfaceBaseType> {
    protected _moduleInstance: ModuleInstance<S, TInterfaceType>;
    private _stateStore: StateStore<S>;

    constructor(moduleInstance: ModuleInstance<S, TInterfaceType>, stateStore: StateStore<S>) {
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

    useInterfaceState<K extends keyof TInterfaceType["baseStates"]>(
        key: K
    ): [Awaited<TInterfaceType["baseStates"][K]>, (value: TInterfaceType["baseStates"][K]) => void] {
        return useInterfaceState(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }

    useInterfaceValue<K extends keyof TInterfaceType["baseStates"]>(key: K): TInterfaceType["baseStates"][K];
    useInterfaceValue<K extends keyof TInterfaceType["derivedStates"]>(key: K): TInterfaceType["derivedStates"][K];
    useInterfaceValue<K extends keyof (TInterfaceType["baseStates"] | TInterfaceType["derivedStates"])>(
        key: K
    ): TInterfaceType["baseStates"][K] | TInterfaceType["derivedStates"][K] {
        return useInterfaceValue(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }

    useSetInterfaceValue<K extends keyof TInterfaceType["baseStates"]>(
        key: K
    ): (value: TInterfaceType["baseStates"][K]) => void {
        return useSetInterfaceValue(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }
}

export type ViewContext<S extends StateBaseType, TInterfaceType extends InterfaceBaseType> = Omit<
    ModuleContext<S, TInterfaceType>,
    "useInterfaceState" | "useSetInterfaceValue"
>;

export type SettingsContext<S extends StateBaseType, TInterfaceType extends InterfaceBaseType> = ModuleContext<
    S,
    TInterfaceType
>;

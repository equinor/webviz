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

import { WritableAtom, useAtom, useAtomValue, useSetAtom } from "jotai";

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

export class ModuleContext<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    protected _moduleInstance: ModuleInstance<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    private _stateStore: StateStore<TStateType>;

    constructor(
        moduleInstance: ModuleInstance<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>,
        stateStore: StateStore<TStateType>
    ) {
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

    useViewAtom<TKey extends keyof TViewAtomsType>(
        key: TKey
    ): [Awaited<TViewAtomsType[TKey]>, (value: TViewAtomsType[TKey]) => void] {
        const atom = this._moduleInstance.getViewAtom(key);

        return useAtom(atom);
    }

    useViewAtomValue<TKey extends keyof TViewAtomsType>(key: TKey): TViewAtomsType[TKey] {
        const atom = this._moduleInstance.getViewAtom(key);

        return useAtomValue(atom);
    }

    useSetViewAtom<
        TKey extends keyof Pick<
            TViewAtomsType,
            keyof {
                [key in keyof TViewAtomsType]: TViewAtomsType[key] extends WritableAtom<any, any[], any> ? key : never;
            }
        >
    >(key: TKey): (...args: [TViewAtomsType[TKey]]) => void {
        const atom = this._moduleInstance.getViewAtom(key) as WritableAtom<TViewAtomsType[TKey], any[], any>;
        return useSetAtom(atom);
    }

    useSettingsAtom<TKey extends keyof TSettingsAtomsType>(
        key: TKey
    ): [Awaited<TSettingsAtomsType[TKey]>, (value: TSettingsAtomsType[TKey]) => void] {
        const atom = this._moduleInstance.getSettingsAtom(key);

        return useAtom(atom);
    }

    useSettingsAtomValue<TKey extends keyof TSettingsAtomsType>(key: TKey): TSettingsAtomsType[TKey] {
        const atom = this._moduleInstance.getSettingsAtom(key);

        return useAtomValue(atom);
    }

    useSetSettingsAtom<
        TKey extends keyof Pick<
            TSettingsAtomsType,
            keyof {
                [key in keyof TSettingsAtomsType]: TSettingsAtomsType[key] extends WritableAtom<any, any[], any>
                    ? key
                    : never;
            }
        >
    >(key: TKey): (...args: [TSettingsAtomsType[TKey]]) => void {
        const atom = this._moduleInstance.getSettingsAtom(key) as WritableAtom<TSettingsAtomsType[TKey], any[], any>;
        return useSetAtom(atom);
    }
}

export type ViewContext<
    StateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> = Omit<
    ModuleContext<StateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>,
    | "useSettingsToViewInterfaceState"
    | "useSetSettingsToViewInterfaceValue"
    | "useSettingsAtom"
    | "useSetSettingsAtom"
    | "useSettingsAtomValue"
>;

export type SettingsContext<
    StateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> = Omit<
    ModuleContext<StateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>,
    "useViewAtom" | "useViewAtomValue" | "useSetViewAtom"
>;

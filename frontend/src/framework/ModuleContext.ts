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
import { WritableAtom, useAtom, useAtomValue, useSetAtom } from "jotai";

import { ChannelContentDefinition, KeyKind } from "./DataChannelTypes";
import { ModuleInterfaceTypes } from "./Module";
import {
    ModuleInstance,
    ModuleInstanceTopic,
    ModuleInstanceTopicValueTypes,
    useModuleInstanceTopicValue,
} from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceBaseType, useSettingsToViewInterfaceValue } from "./UniDirectionalModuleComponentsInterface";
import { useChannelReceiver } from "./internal/DataChannels/hooks/useChannelReceiver";
import { usePublishChannelContents } from "./internal/DataChannels/hooks/usePublishChannelContents";

export class ModuleContext<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    protected _moduleInstance: ModuleInstance<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;

    constructor(moduleInstance: ModuleInstance<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>) {
        this._moduleInstance = moduleInstance;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    useModuleInstanceTopic<T extends ModuleInstanceTopic>(topic: T): ModuleInstanceTopicValueTypes[T] {
        return useModuleInstanceTopicValue(this._moduleInstance, topic);
    }

    useSyncedSettingKeys(): SyncSettingKey[] {
        return useModuleInstanceTopicValue(this._moduleInstance, ModuleInstanceTopic.SYNCED_SETTINGS);
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

    useSettingsToViewInterfaceValue<TKey extends keyof TInterfaceTypes["settingsToView"]>(
        key: TKey
    ): TInterfaceTypes["settingsToView"][TKey] {
        return useSettingsToViewInterfaceValue(this._moduleInstance.getUniDirectionalSettingsToViewInterface(), key);
    }

    useViewToSettingsInterfaceValue<TKey extends keyof TInterfaceTypes["viewToSettings"]>(
        key: TKey
    ): TInterfaceTypes["viewToSettings"][TKey] {
        return useSettingsToViewInterfaceValue(this._moduleInstance.getUniDirectionalViewToSettingsInterface(), key);
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
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> = Omit<
    ModuleContext<TInterfaceType, TSettingsAtomsType, TViewAtomsType>,
    "useViewToSettingsInterfaceValue" | "useSettingsAtom" | "useSetSettingsAtom" | "useSettingsAtomValue"
>;

export type SettingsContext<
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> = Omit<
    ModuleContext<TInterfaceType, TSettingsAtomsType, TViewAtomsType>,
    "useSettingsToViewInterfaceValue" | "useViewAtom" | "useViewAtomValue" | "useSetViewAtom"
>;

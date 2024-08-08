import React, { ErrorInfo } from "react";

import { Atom, atom } from "jotai";
import { atomEffect } from "jotai-effect";

import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ImportState, Module, ModuleInterfaceTypes, ModuleSettings, ModuleView } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceInitialization,
    UniDirectionalModuleComponentsInterface,
} from "./UniDirectionalModuleComponentsInterface";
import { Workbench } from "./Workbench";
import { ChannelManager } from "./internal/DataChannels/ChannelManager";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

export enum ModuleInstanceState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export enum ModuleInstanceTopic {
    TITLE = "title",
    SYNCED_SETTINGS = "synced-settings",
    STATE = "state",
    IMPORT_STATE = "import-state",
}

export type ModuleInstanceTopicValueTypes = {
    [ModuleInstanceTopic.TITLE]: string;
    [ModuleInstanceTopic.SYNCED_SETTINGS]: SyncSettingKey[];
    [ModuleInstanceTopic.STATE]: ModuleInstanceState;
    [ModuleInstanceTopic.IMPORT_STATE]: ImportState;
};

export interface ModuleInstanceOptions<TInterfaceTypes extends ModuleInterfaceTypes> {
    module: Module<TInterfaceTypes>;
    workbench: Workbench;
    instanceNumber: number;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export class ModuleInstance<TInterfaceTypes extends ModuleInterfaceTypes> {
    private _id: string;
    private _title: string;
    private _initialized: boolean = false;
    private _moduleInstanceState: ModuleInstanceState = ModuleInstanceState.INITIALIZING;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null = null;
    private _syncedSettingKeys: SyncSettingKey[] = [];
    private _module: Module<TInterfaceTypes>;
    private _context: ModuleContext<TInterfaceTypes> | null = null;
    private _subscribers: Map<keyof ModuleInstanceTopicValueTypes, Set<() => void>> = new Map();
    private _initialSettings: InitialSettings | null = null;
    private _statusController: ModuleInstanceStatusControllerInternal = new ModuleInstanceStatusControllerInternal();
    private _channelManager: ChannelManager;
    private _settingsToViewInterface: UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewToSettingsInterface: UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _settingsToViewInterfaceEffectsAtom: Atom<void> | null = null;
    private _viewToSettingsInterfaceEffectsAtom: Atom<void> | null = null;

    constructor(options: ModuleInstanceOptions<TInterfaceTypes>) {
        this._id = `${options.module.getName()}-${options.instanceNumber}`;
        this._title = options.module.getDefaultTitle();
        this._module = options.module;

        this._channelManager = new ChannelManager(this._id);

        if (options.channelReceiverDefinitions) {
            this._channelManager.registerReceivers(
                options.channelReceiverDefinitions.map((el) => ({
                    ...el,
                    supportsMultiContents: el.supportsMultiContents ?? false,
                }))
            );
        }

        if (options.channelDefinitions) {
            this._channelManager.registerChannels(options.channelDefinitions);
        }
    }

    getUniDirectionalSettingsToViewInterface(): UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > {
        if (!this._settingsToViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        return this._settingsToViewInterface;
    }

    getUniDirectionalViewToSettingsInterface(): UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > {
        if (!this._viewToSettingsInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        return this._viewToSettingsInterface;
    }

    getChannelManager(): ChannelManager {
        return this._channelManager;
    }

    initialize(): void {
        this._context = new ModuleContext<TInterfaceTypes>(this);
        this._initialized = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    makeSettingsToViewInterface(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>
    ) {
        if (!interfaceInitialization) {
            return;
        }
        this._settingsToViewInterface = new UniDirectionalModuleComponentsInterface(interfaceInitialization);
    }

    makeViewToSettingsInterface(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>
    ) {
        if (!interfaceInitialization) {
            return;
        }
        this._viewToSettingsInterface = new UniDirectionalModuleComponentsInterface(interfaceInitialization);
    }

    makeSettingsToViewInterfaceEffectsAtom(): void {
        const effectFuncs = this.getModule().getSettingsToViewInterfaceEffects();
        const getUniDirectionalSettingsToViewInterface: () => UniDirectionalModuleComponentsInterface<
            Exclude<TInterfaceTypes["settingsToView"], undefined>
        > = () => this.getUniDirectionalSettingsToViewInterface();

        const newEffects: Atom<void>[] = [];
        for (const effectFunc of effectFuncs) {
            const effect = atomEffect((get, set) => {
                function getAtomFromInterface<TKey extends keyof Exclude<TInterfaceTypes["settingsToView"], undefined>>(
                    key: TKey
                ): Exclude<TInterfaceTypes["settingsToView"], undefined>[TKey] {
                    return get(getUniDirectionalSettingsToViewInterface().getAtom(key));
                }
                effectFunc(getAtomFromInterface, set, get);
            });
            newEffects.push(effect);
        }
        this._settingsToViewInterfaceEffectsAtom = atom((get) => {
            for (const effect of newEffects) {
                get(effect);
            }
        });
    }

    makeViewToSettingsInterfaceEffectsAtom(): void {
        const effectFuncs = this.getModule().getViewToSettingsInterfaceEffects();
        const getUniDirectionalViewToSettingsInterface: () => UniDirectionalModuleComponentsInterface<
            Exclude<TInterfaceTypes["viewToSettings"], undefined>
        > = () => this.getUniDirectionalViewToSettingsInterface();

        const newEffects: Atom<void>[] = [];
        for (const effectFunc of effectFuncs) {
            const effect = atomEffect((get, set) => {
                function getAtomFromInterface<TKey extends keyof Exclude<TInterfaceTypes["viewToSettings"], undefined>>(
                    key: TKey
                ): Exclude<TInterfaceTypes["viewToSettings"], undefined>[TKey] {
                    return get(getUniDirectionalViewToSettingsInterface().getAtom(key));
                }
                effectFunc(getAtomFromInterface, set, get);
            });
            newEffects.push(effect);
        }
        this._viewToSettingsInterfaceEffectsAtom = atom((get) => {
            for (const effect of newEffects) {
                get(effect);
            }
        });
    }

    getSettingsToViewInterfaceEffectsAtom(): Atom<void> {
        if (!this._settingsToViewInterfaceEffectsAtom) {
            throw `Module instance '${this._title}' does not have settings to view interface effects yet. Did you forget to init the module?`;
        }
        return this._settingsToViewInterfaceEffectsAtom;
    }

    getViewToSettingsInterfaceEffectsAtom(): Atom<void> {
        if (!this._viewToSettingsInterfaceEffectsAtom) {
            throw `Module instance '${this._title}' does not have view to settings interface effects yet. Did you forget to init the module?`;
        }
        return this._viewToSettingsInterfaceEffectsAtom;
    }

    addSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys.push(settingKey);
        this.notifySubscribers(ModuleInstanceTopic.SYNCED_SETTINGS);
    }

    getSyncedSettingKeys(): SyncSettingKey[] {
        return this._syncedSettingKeys;
    }

    isSyncedSetting(settingKey: SyncSettingKey): boolean {
        return this._syncedSettingKeys.includes(settingKey);
    }

    removeSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys = this._syncedSettingKeys.filter((a) => a !== settingKey);
        this.notifySubscribers(ModuleInstanceTopic.SYNCED_SETTINGS);
    }

    isInitialized(): boolean {
        return this._initialized;
    }

    getViewFC(): ModuleView<TInterfaceTypes> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleSettings<TInterfaceTypes> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TInterfaceTypes> {
        if (!this._context) {
            throw `Module context is not available yet. Did you forget to init the module '${this._title}.'?`;
        }
        return this._context;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._module.getName();
    }

    getTitle(): string {
        return this._title;
    }

    setTitle(title: string): void {
        this._title = title;
        this.notifySubscribers(ModuleInstanceTopic.TITLE);
    }

    notifySubscribers(topic: ModuleInstanceTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => {
                subscriber();
            });
        }
    }

    makeSubscriberFunction(topic: ModuleInstanceTopic): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(topic) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(topic, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }

    makeSnapshotGetter<T extends ModuleInstanceTopic>(topic: T): () => ModuleInstanceTopicValueTypes[T] {
        const snapshotGetter = (): any => {
            if (topic === ModuleInstanceTopic.TITLE) {
                return this.getTitle();
            }
            if (topic === ModuleInstanceTopic.SYNCED_SETTINGS) {
                return this.getSyncedSettingKeys();
            }
            if (topic === ModuleInstanceTopic.STATE) {
                return this.getModuleInstanceState();
            }
            if (topic === ModuleInstanceTopic.IMPORT_STATE) {
                return this.getImportState();
            }
        };

        return snapshotGetter;
    }

    getModule(): Module<TInterfaceTypes> {
        return this._module;
    }

    getStatusController(): ModuleInstanceStatusControllerInternal {
        return this._statusController;
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceState): void {
        this._moduleInstanceState = moduleInstanceState;
        this.notifySubscribers(ModuleInstanceTopic.STATE);
    }

    getModuleInstanceState(): ModuleInstanceState {
        return this._moduleInstanceState;
    }

    setFatalError(err: Error, errInfo: ErrorInfo): void {
        this.setModuleInstanceState(ModuleInstanceState.ERROR);
        this._fatalError = {
            err,
            errInfo,
        };
    }

    getFatalError(): {
        err: Error;
        errInfo: ErrorInfo;
    } | null {
        return this._fatalError;
    }

    reset(): Promise<void> {
        this.setModuleInstanceState(ModuleInstanceState.RESETTING);

        return new Promise((resolve) => {
            this.initialize();
            resolve();
        });
    }

    setInitialSettings(initialSettings: InitialSettings): void {
        this._initialSettings = initialSettings;
    }

    getInitialSettings(): InitialSettings | null {
        return this._initialSettings;
    }
}

export function useModuleInstanceTopicValue<T extends ModuleInstanceTopic>(
    moduleInstance: ModuleInstance<any>,
    topic: T
): ModuleInstanceTopicValueTypes[T] {
    const value = React.useSyncExternalStore<ModuleInstanceTopicValueTypes[T]>(
        moduleInstance.makeSubscriberFunction(topic),
        moduleInstance.makeSnapshotGetter(topic)
    );

    return value;
}

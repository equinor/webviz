import type { ErrorInfo } from "react";
import React from "react";

import type { JTDDataType } from "ajv/dist/core";
import type { Atom } from "jotai";
import { atom } from "jotai";
import { atomEffect } from "jotai-effect";

import type { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import type { InitialSettings } from "./InitialSettings";
import { ChannelManager } from "./internal/DataChannels/ChannelManager";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";
import type {
    ImportStatus,
    Module,
    ModuleStateBaseSchema,
    ModuleInterfaceTypes,
    ModuleSettings,
    SerializedModuleState,
    ModuleView,
} from "./Module";
import { ModuleContext } from "./ModuleContext";
import type { SyncSettingKey } from "./SyncSettings";
import type { InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";
import { UniDirectionalModuleComponentsInterface } from "./UniDirectionalModuleComponentsInterface";

export enum ModuleInstanceLifeCycleState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export enum ModuleInstanceTopic {
    TITLE = "title",
    SYNCED_SETTINGS = "synced-settings",
    LIFECYCLE_STATE = "state",
    IMPORT_STATUS = "import-status",
    SERIALIZED_STATE = "serialized-state",
}

export type ModuleInstanceTopicValueTypes = {
    [ModuleInstanceTopic.TITLE]: string;
    [ModuleInstanceTopic.SYNCED_SETTINGS]: SyncSettingKey[];
    [ModuleInstanceTopic.LIFECYCLE_STATE]: ModuleInstanceLifeCycleState;
    [ModuleInstanceTopic.IMPORT_STATUS]: ImportStatus;
    [ModuleInstanceTopic.SERIALIZED_STATE]: ModuleStateBaseSchema;
};

export interface ModuleInstanceOptions<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSerializedStateSchema extends ModuleStateBaseSchema,
> {
    module: Module<TInterfaceTypes, TSerializedStateSchema>;
    id: string;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export type ModuleInstanceFullState<TSerializedStateSchema extends ModuleStateBaseSchema> = {
    id: string;
    name: string;
    dataChannelReceiverSubscriptions: {
        idString: string;
        listensToModuleInstanceId: string;
        channelIdString: string;
        contentIdStrings: string[];
    }[];
    syncedSettingKeys: SyncSettingKey[];
    serializedState: SerializedModuleState<TSerializedStateSchema> | null;
};

export class ModuleInstance<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSerializedStateSchema extends ModuleStateBaseSchema,
> {
    private _id: string;
    private _title: string;
    private _initialized: boolean = false;
    private _moduleInstanceState: ModuleInstanceLifeCycleState = ModuleInstanceLifeCycleState.INITIALIZING;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null = null;
    private _syncedSettingKeys: SyncSettingKey[] = [];
    private _module: Module<TInterfaceTypes, TSerializedStateSchema>;
    private _context: ModuleContext<TInterfaceTypes, TSerializedStateSchema> | null = null;
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
    private _serializedState: SerializedModuleState<TSerializedStateSchema> | null = null;

    constructor(options: ModuleInstanceOptions<TInterfaceTypes, TSerializedStateSchema>) {
        this._id = options.id;
        this._title = options.module.getDefaultTitle();
        this._module = options.module;

        this._channelManager = new ChannelManager(this._id);

        if (options.channelReceiverDefinitions) {
            this._channelManager.registerReceivers(
                options.channelReceiverDefinitions.map((el) => ({
                    ...el,
                    supportsMultiContents: el.supportsMultiContents ?? false,
                })),
            );
        }

        if (options.channelDefinitions) {
            this._channelManager.registerChannels(options.channelDefinitions);
        }
    }

    setSerializedState(serializedState: SerializedModuleState<TSerializedStateSchema>): void {
        this._serializedState = serializedState;
    }

    getSerializedState(): SerializedModuleState<TSerializedStateSchema> | null {
        return this._serializedState;
    }

    setFullState(fullState: ModuleInstanceFullState<TSerializedStateSchema>): void {
        this._syncedSettingKeys = fullState.syncedSettingKeys;
        this._serializedState = fullState.serializedState ?? null;
    }

    getFullState(): ModuleInstanceFullState<TSerializedStateSchema> {
        return {
            id: this._id,
            dataChannelReceiverSubscriptions: this._channelManager
                .getReceivers()
                .filter((receiver) => receiver.hasActiveSubscription())
                .map((receiver) => ({
                    idString: receiver.getIdString(),
                    listensToModuleInstanceId: receiver.getChannel()?.getManager().getModuleInstanceId() ?? "",
                    channelIdString: receiver.getChannel()?.getIdString() ?? "",
                    contentIdStrings: receiver.getContentIdStrings(),
                })),
            syncedSettingKeys: this._syncedSettingKeys,
            serializedState: this._serializedState,
        };
    }

    serializeSettingsState(state: JTDDataType<TSerializedStateSchema["settings"]>): void {
        this._serializedState = {
            ...(this._serializedState ?? ({} as SerializedModuleState<TSerializedStateSchema>)),
            settings: state,
        };
        this.notifySubscribers(ModuleInstanceTopic.SERIALIZED_STATE);
    }

    serializeViewState(state: JTDDataType<TSerializedStateSchema["view"]>): void {
        this._serializedState = {
            ...(this._serializedState ?? ({} as SerializedModuleState<TSerializedStateSchema>)),
            view: state,
        };
        this.notifySubscribers(ModuleInstanceTopic.SERIALIZED_STATE);
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
        this._context = new ModuleContext<TInterfaceTypes, TSerializedStateSchema>(this);
        this._initialized = true;
        this.setModuleInstanceState(ModuleInstanceLifeCycleState.OK);
    }

    makeSettingsToViewInterface(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>,
    ) {
        if (!interfaceInitialization) {
            return;
        }
        this._settingsToViewInterface = new UniDirectionalModuleComponentsInterface(interfaceInitialization);
    }

    makeViewToSettingsInterface(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>,
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
                    key: TKey,
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
                    key: TKey,
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

    getViewFC(): ModuleView<TInterfaceTypes, TSerializedStateSchema> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleSettings<TInterfaceTypes, TSerializedStateSchema> {
        return this._module.settingsFC;
    }

    getImportState(): ImportStatus {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TInterfaceTypes, TSerializedStateSchema> {
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
            if (topic === ModuleInstanceTopic.LIFECYCLE_STATE) {
                return this.getModuleInstanceState();
            }
            if (topic === ModuleInstanceTopic.IMPORT_STATUS) {
                return this.getImportState();
            }
            if (topic === ModuleInstanceTopic.SERIALIZED_STATE) {
                return this.getSerializedState();
            }
        };

        return snapshotGetter;
    }

    getModule(): Module<TInterfaceTypes, TSerializedStateSchema> {
        return this._module;
    }

    getStatusController(): ModuleInstanceStatusControllerInternal {
        return this._statusController;
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceLifeCycleState): void {
        this._moduleInstanceState = moduleInstanceState;
        this.notifySubscribers(ModuleInstanceTopic.LIFECYCLE_STATE);
    }

    getModuleInstanceState(): ModuleInstanceLifeCycleState {
        return this._moduleInstanceState;
    }

    setFatalError(err: Error, errInfo: ErrorInfo): void {
        this.setModuleInstanceState(ModuleInstanceLifeCycleState.ERROR);
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
        this.setModuleInstanceState(ModuleInstanceLifeCycleState.RESETTING);

        return new Promise((resolve) => {
            this._module.onInstanceUnload(this._id);

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

    unload() {
        this._module.onInstanceUnload(this._id);
    }
}

export function useModuleInstanceTopicValue<T extends ModuleInstanceTopic>(
    moduleInstance: ModuleInstance<any, any>,
    topic: T,
): ModuleInstanceTopicValueTypes[T] {
    const value = React.useSyncExternalStore<ModuleInstanceTopicValueTypes[T]>(
        moduleInstance.makeSubscriberFunction(topic),
        moduleInstance.makeSnapshotGetter(topic),
    );

    return value;
}

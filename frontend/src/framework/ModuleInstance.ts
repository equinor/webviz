import React, { ErrorInfo } from "react";

import { AtomStore } from "./AtomStoreMaster";
import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import {
    AtomsInitialization,
    ImportState,
    Module,
    ModuleAtoms,
    ModuleInterfaceTypes,
    ModuleSettings,
    ModuleView,
} from "./Module";
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

export interface ModuleInstanceOptions<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    module: Module<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
    workbench: Workbench;
    instanceNumber: number;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export class ModuleInstance<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    private _id: string;
    private _title: string;
    private _initialized: boolean = false;
    private _moduleInstanceState: ModuleInstanceState = ModuleInstanceState.INITIALIZING;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null = null;
    private _syncedSettingKeys: SyncSettingKey[] = [];
    private _module: Module<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
    private _context: ModuleContext<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> | null = null;
    private _subscribers: Map<keyof ModuleInstanceTopicValueTypes, Set<() => void>> = new Map();
    private _initialSettings: InitialSettings | null = null;
    private _statusController: ModuleInstanceStatusControllerInternal = new ModuleInstanceStatusControllerInternal();
    private _channelManager: ChannelManager;
    private _workbench: Workbench;
    private _settingsToViewInterface: UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewToSettingsInterface: UniDirectionalModuleComponentsInterface<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _settingsAtoms: ModuleAtoms<TSettingsAtomsType> | null = null;
    private _viewAtoms: ModuleAtoms<TViewAtomsType> | null = null;

    constructor(options: ModuleInstanceOptions<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>) {
        this._id = `${options.module.getName()}-${options.instanceNumber}`;
        this._title = options.module.getDefaultTitle();
        this._module = options.module;
        this._workbench = options.workbench;

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

    getAtomStore(): AtomStore {
        return this._workbench.getAtomStoreMaster().getAtomStoreForModuleInstance(this._id);
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

    getSettingsAtom<TKey extends keyof TSettingsAtomsType>(key: TKey): ModuleAtoms<TSettingsAtomsType>[TKey] {
        if (!this._settingsAtoms) {
            throw `Module instance '${this._title}' does not have initialized settings atoms yet. Did you forget to add an atom initialization when registering the module?`;
        }
        return this._settingsAtoms[key];
    }

    getViewAtom<TKey extends keyof TViewAtomsType>(key: TKey): ModuleAtoms<TViewAtomsType>[TKey] {
        if (!this._viewAtoms) {
            throw `Module instance '${this._title}' does not have initialized view atoms yet. Did you forget to add an atom initialization when registering the module?`;
        }
        return this._viewAtoms[key];
    }

    getChannelManager(): ChannelManager {
        return this._channelManager;
    }

    initialize(): void {
        this._context = new ModuleContext<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>(this);
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

    makeSettingsAtoms(
        initFunc: AtomsInitialization<TSettingsAtomsType, Exclude<TInterfaceTypes["viewToSettings"], undefined>>
    ) {
        if (!this._settingsToViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        this._settingsAtoms = initFunc(this._settingsToViewInterface);
    }

    makeViewAtoms(
        initFunc: AtomsInitialization<TViewAtomsType, Exclude<TInterfaceTypes["settingsToView"], undefined>>
    ) {
        if (!this._settingsToViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        this._viewAtoms = initFunc(this._settingsToViewInterface);
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

    getViewFC(): ModuleView<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleSettings<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> {
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

    getModule(): Module<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> {
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
    moduleInstance: ModuleInstance<any, any, any>,
    topic: T
): ModuleInstanceTopicValueTypes[T] {
    const value = React.useSyncExternalStore<ModuleInstanceTopicValueTypes[T]>(
        moduleInstance.makeSubscriberFunction(topic),
        moduleInstance.makeSnapshotGetter(topic)
    );

    return value;
}

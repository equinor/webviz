import React, { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { AtomStore } from "./AtomStoreMaster";
import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { AtomsInitialization, ImportState, Module, ModuleAtoms, ModuleSettings, ModuleView } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceBaseType,
    InterfaceInitialization,
    UniDirectionalSettingsToViewInterface,
} from "./UniDirectionalSettingsToViewInterface";
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
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    module: Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    workbench: Workbench;
    instanceNumber: number;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export class ModuleInstance<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    private _id: string;
    private _title: string;
    private _initialised: boolean;
    private _moduleInstanceState: ModuleInstanceState;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null;
    private _syncedSettingKeys: SyncSettingKey[];
    private _stateStore: StateStore<TStateType> | null;
    private _module: Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    private _context: ModuleContext<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> | null;
    private _subscribers: Map<keyof ModuleInstanceTopicValueTypes, Set<() => void>> = new Map();
    private _cachedDefaultState: TStateType | null;
    private _cachedStateStoreOptions?: StateOptions<TStateType>;
    private _initialSettings: InitialSettings | null;
    private _statusController: ModuleInstanceStatusControllerInternal;
    private _channelManager: ChannelManager;
    private _workbench: Workbench;
    private _settingsViewInterface: UniDirectionalSettingsToViewInterface<TInterfaceType> | null;
    private _settingsAtoms: ModuleAtoms<TSettingsAtomsType> | null;
    private _viewAtoms: ModuleAtoms<TViewAtomsType> | null;

    constructor(options: ModuleInstanceOptions<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>) {
        this._id = `${options.module.getName()}-${options.instanceNumber}`;
        this._title = options.module.getDefaultTitle();
        this._stateStore = null;
        this._module = options.module;
        this._context = null;
        this._initialised = false;
        this._syncedSettingKeys = [];
        this._moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this._fatalError = null;
        this._cachedDefaultState = null;
        this._initialSettings = null;
        this._statusController = new ModuleInstanceStatusControllerInternal();
        this._workbench = options.workbench;
        this._settingsViewInterface = null;
        this._settingsAtoms = null;
        this._viewAtoms = null;

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

    getUniDirectionalSettingsToViewInterface(): UniDirectionalSettingsToViewInterface<TInterfaceType> {
        if (!this._settingsViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        return this._settingsViewInterface;
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

    setDefaultState(defaultState: TStateType, options?: StateOptions<TStateType>): void {
        if (this._cachedDefaultState === null) {
            this._cachedDefaultState = defaultState;
            this._cachedStateStoreOptions = options;
        }

        this._stateStore = new StateStore<TStateType>(cloneDeep(defaultState), options);
        this._context = new ModuleContext<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>(
            this,
            this._stateStore
        );
        this._initialised = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    makeSettingsToViewInterface(interfaceInitialization: InterfaceInitialization<TInterfaceType>) {
        this._settingsViewInterface = new UniDirectionalSettingsToViewInterface(interfaceInitialization);
    }

    makeSettingsAtoms(initFunc: AtomsInitialization<TSettingsAtomsType, TInterfaceType>) {
        if (!this._settingsViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        this._settingsAtoms = initFunc(this._settingsViewInterface);
    }

    makeViewAtoms(initFunc: AtomsInitialization<TViewAtomsType, TInterfaceType>) {
        if (!this._settingsViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        this._viewAtoms = initFunc(this._settingsViewInterface);
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
        return this._initialised;
    }

    getViewFC(): ModuleView<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleSettings<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
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

    getModule(): Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
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
            this.setDefaultState(this._cachedDefaultState as TStateType, this._cachedStateStoreOptions);
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
    moduleInstance: ModuleInstance<any, any, any, any>,
    topic: T
): ModuleInstanceTopicValueTypes[T] {
    const value = React.useSyncExternalStore<ModuleInstanceTopicValueTypes[T]>(
        moduleInstance.makeSubscriberFunction(topic),
        moduleInstance.makeSnapshotGetter(topic)
    );

    return value;
}

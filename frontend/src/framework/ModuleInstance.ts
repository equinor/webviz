import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { AtomStore } from "./AtomStoreMaster";
import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ImportState, Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ChannelManager } from "./internal/DataChannels/ChannelManager";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

export enum ModuleInstanceState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export interface ModuleInstanceOptions<StateType extends StateBaseType> {
    module: Module<StateType>;
    instanceNumber: number;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export class ModuleInstance<StateType extends StateBaseType> {
    private _id: string;
    private _title: string;
    private _initialised: boolean;
    private _moduleInstanceState: ModuleInstanceState;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null;
    private _syncedSettingKeys: SyncSettingKey[];
    private _stateStore: StateStore<StateType> | null;
    private _module: Module<StateType>;
    private _context: ModuleContext<StateType> | null;
    private _importStateSubscribers: Set<() => void>;
    private _moduleInstanceStateSubscribers: Set<(moduleInstanceState: ModuleInstanceState) => void>;
    private _syncedSettingsSubscribers: Set<(syncedSettings: SyncSettingKey[]) => void>;
    private _titleChangeSubscribers: Set<(title: string) => void>;
    private _cachedDefaultState: StateType | null;
    private _cachedStateStoreOptions?: StateOptions<StateType>;
    private _initialSettings: InitialSettings | null;
    private _statusController: ModuleInstanceStatusControllerInternal;
    private _channelManager: ChannelManager;

    constructor(options: ModuleInstanceOptions<StateType>) {
        this._id = `${options.module.getName()}-${options.instanceNumber}`;
        this._title = options.module.getDefaultTitle();
        this._stateStore = null;
        this._module = options.module;
        this._importStateSubscribers = new Set();
        this._context = null;
        this._initialised = false;
        this._syncedSettingKeys = [];
        this._syncedSettingsSubscribers = new Set();
        this._moduleInstanceStateSubscribers = new Set();
        this._titleChangeSubscribers = new Set();
        this._moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this._fatalError = null;
        this._cachedDefaultState = null;
        this._initialSettings = null;
        this._statusController = new ModuleInstanceStatusControllerInternal();

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
    getAtomStore(): AtomStore {
        return this._workbench.getAtomStoreMaster().getAtomStoreForModuleInstance(this._id);
    }
        }
    }

    getChannelManager(): ChannelManager {
        return this._channelManager;
    }

    setDefaultState(defaultState: StateType, options?: StateOptions<StateType>): void {
        if (this._cachedDefaultState === null) {
            this._cachedDefaultState = defaultState;
            this._cachedStateStoreOptions = options;
        }

        this._stateStore = new StateStore<StateType>(cloneDeep(defaultState), options);
        this._context = new ModuleContext<StateType>(this, this._stateStore);
        this._initialised = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    addSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys.push(settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    getSyncedSettingKeys(): SyncSettingKey[] {
        return this._syncedSettingKeys;
    }

    isSyncedSetting(settingKey: SyncSettingKey): boolean {
        return this._syncedSettingKeys.includes(settingKey);
    }

    removeSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys = this._syncedSettingKeys.filter((a) => a !== settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    subscribeToSyncedSettingKeysChange(cb: (syncedSettings: SyncSettingKey[]) => void): () => void {
        this._syncedSettingsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb(this._syncedSettingKeys);

        return () => {
            this._syncedSettingsSubscribers.delete(cb);
        };
    }

    isInitialised(): boolean {
        return this._initialised;
    }

    getViewFC(): ModuleFC<StateType> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleFC<StateType> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<StateType> {
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
        this.notifySubscribersAboutTitleChange();
    }

    subscribeToTitleChange(cb: (title: string) => void): () => void {
        this._titleChangeSubscribers.add(cb);
        return () => {
            this._titleChangeSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutTitleChange(): void {
        this._titleChangeSubscribers.forEach((subscriber) => {
            subscriber(this._title);
        });
    }

    getModule(): Module<StateType> {
        return this._module;
    }

    getStatusController(): ModuleInstanceStatusControllerInternal {
        return this._statusController;
    }

    subscribeToImportStateChange(cb: () => void): () => void {
        this._importStateSubscribers.add(cb);
        return () => {
            this._importStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutImportStateChange(): void {
        this._importStateSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    notifySubscribersAboutSyncedSettingKeysChange(): void {
        this._syncedSettingsSubscribers.forEach((subscriber) => {
            subscriber(this._syncedSettingKeys);
        });
    }

    subscribeToModuleInstanceStateChange(cb: () => void): () => void {
        this._moduleInstanceStateSubscribers.add(cb);
        return () => {
            this._moduleInstanceStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutModuleInstanceStateChange(): void {
        this._moduleInstanceStateSubscribers.forEach((subscriber) => {
            subscriber(this._moduleInstanceState);
        });
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceState): void {
        this._moduleInstanceState = moduleInstanceState;
        this.notifySubscribersAboutModuleInstanceStateChange();
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
            this.setDefaultState(this._cachedDefaultState as StateType, this._cachedStateStoreOptions);
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

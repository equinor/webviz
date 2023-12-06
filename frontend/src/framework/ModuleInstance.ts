import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { ModuleChannelDefinition, ModuleChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ImportState, Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ModuleChannelManager } from "./internal/DataChannels/ModuleChannelManager";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

export enum ModuleInstanceState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export class ModuleInstance<TStateType extends StateBaseType> {
    private _id: string;
    private _title: string;
    private _initialised: boolean;
    private _moduleInstanceState: ModuleInstanceState;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null;
    private _syncedSettingKeys: SyncSettingKey[];
    private _stateStore: StateStore<TStateType> | null;
    private _module: Module<TStateType>;
    private _context: ModuleContext<TStateType> | null;
    private _importStateSubscribers: Set<() => void>;
    private _moduleInstanceStateSubscribers: Set<(moduleInstanceState: ModuleInstanceState) => void>;
    private _syncedSettingsSubscribers: Set<(syncedSettings: SyncSettingKey[]) => void>;
    private _titleChangeSubscribers: Set<(title: string) => void>;
    private _cachedDefaultState: TStateType | null;
    private _cachedStateStoreOptions?: StateOptions<TStateType>;
    private _initialSettings: InitialSettings | null;
    private _statusController: ModuleInstanceStatusControllerInternal;
    private _publishSubscribeBroker: ModuleChannelManager;

    constructor(options: {
        module: Module<TStateType>;
        instanceNumber: number;

        channels: ModuleChannelDefinition[] | null;
        subscribers: ModuleChannelReceiverDefinition[] | null;
    }) {
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

        this._publishSubscribeBroker = new ModuleChannelManager(this._id);

        if (options.subscribers) {
            for (const subscriber of options.subscribers) {
                this._publishSubscribeBroker.registerReceiver({
                    idString: subscriber.idString,
                    displayName: subscriber.displayName,
                    supportedKindsOfKeys: subscriber.supportedKindsOfKeys,
                    supportsMultiContents: subscriber.supportsMultiContents ?? false,
                });
            }
        }

        if (options.channels) {
            for (const channel of options.channels) {
                this._publishSubscribeBroker.registerChannel({
                    idString: channel.idString,
                    displayName: channel.displayName,
                    kindOfKey: channel.kindOfKey,
                });
            }
        }
    }

    getPublishSubscribeBroker(): ModuleChannelManager {
        return this._publishSubscribeBroker;
    }

    setDefaultState(defaultState: TStateType, options?: StateOptions<TStateType>): void {
        if (this._cachedDefaultState === null) {
            this._cachedDefaultState = defaultState;
            this._cachedStateStoreOptions = options;
        }

        this._stateStore = new StateStore<TStateType>(cloneDeep(defaultState), options);
        this._context = new ModuleContext<TStateType>(this, this._stateStore);
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

    getViewFC(): ModuleFC<TStateType> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleFC<TStateType> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TStateType> {
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

    getModule(): Module<TStateType> {
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

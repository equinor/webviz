import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannel, BroadcastChannelsDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ImportState, Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";

export enum ModuleInstanceState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export class ModuleInstance<StateType extends StateBaseType> {
    private id: string;
    private title: string;
    private initialised: boolean;
    private moduleInstanceState: ModuleInstanceState;
    private fatalError: {
        err: Error;
        errInfo: ErrorInfo;
    } | null;
    private syncedSettingKeys: SyncSettingKey[];
    private stateStore: StateStore<StateType> | null;
    private module: Module<StateType>;
    private context: ModuleContext<StateType> | null;
    private importStateSubscribers: Set<() => void>;
    private moduleInstanceStateSubscribers: Set<(moduleInstanceState: ModuleInstanceState) => void>;
    private syncedSettingsSubscribers: Set<(syncedSettings: SyncSettingKey[]) => void>;
    private titleChangeSubscribers: Set<(title: string) => void>;
    private broadcastChannels: Record<string, BroadcastChannel>;
    private cachedDefaultState: StateType | null;
    private cachedStateStoreOptions?: StateOptions<StateType>;
    private _initialSettings: InitialSettings | null;

    constructor(
        module: Module<StateType>,
        instanceNumber: number,
        broadcastChannelsDef: BroadcastChannelsDef,
        workbench: Workbench
    ) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.title = module.getDefaultTitle();
        this.stateStore = null;
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
        this.initialised = false;
        this.syncedSettingKeys = [];
        this.syncedSettingsSubscribers = new Set();
        this.moduleInstanceStateSubscribers = new Set();
        this.titleChangeSubscribers = new Set();
        this.moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this.fatalError = null;
        this.cachedDefaultState = null;
        this._initialSettings = null;

        this.broadcastChannels = {} as Record<string, BroadcastChannel>;

        const broadcastChannelNames = Object.keys(broadcastChannelsDef);

        if (broadcastChannelNames) {
            broadcastChannelNames.forEach((channelName) => {
                const enrichedChannelName = `${this.id} - ${channelName as string}`;
                this.broadcastChannels[channelName] = workbench
                    .getBroadcaster()
                    .registerChannel(enrichedChannelName, broadcastChannelsDef[channelName as string], this.id);
            });
        }
    }

    getBroadcastChannel(channelName: string): BroadcastChannel {
        if (!this.broadcastChannels[channelName]) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this.title}'`);
        }

        return this.broadcastChannels[channelName];
    }

    setDefaultState(defaultState: StateType, options?: StateOptions<StateType>): void {
        if (this.cachedDefaultState === null) {
            this.cachedDefaultState = defaultState;
            this.cachedStateStoreOptions = options;
        }

        this.stateStore = new StateStore<StateType>(cloneDeep(defaultState), options);
        this.context = new ModuleContext<StateType>(this, this.stateStore);
        this.initialised = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    addSyncedSetting(settingKey: SyncSettingKey): void {
        this.syncedSettingKeys.push(settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    getSyncedSettingKeys(): SyncSettingKey[] {
        return this.syncedSettingKeys;
    }

    isSyncedSetting(settingKey: SyncSettingKey): boolean {
        return this.syncedSettingKeys.includes(settingKey);
    }

    removeSyncedSetting(settingKey: SyncSettingKey): void {
        this.syncedSettingKeys = this.syncedSettingKeys.filter((a) => a !== settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    subscribeToSyncedSettingKeysChange(cb: (syncedSettings: SyncSettingKey[]) => void): () => void {
        this.syncedSettingsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb(this.syncedSettingKeys);

        return () => {
            this.syncedSettingsSubscribers.delete(cb);
        };
    }

    isInitialised(): boolean {
        return this.initialised;
    }

    getViewFC(): ModuleFC<StateType> {
        return this.module.viewFC;
    }

    getSettingsFC(): ModuleFC<StateType> {
        return this.module.settingsFC;
    }

    getImportState(): ImportState {
        return this.module.getImportState();
    }

    getContext(): ModuleContext<StateType> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.title}.'?`;
        }
        return this.context;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.module.getName();
    }

    getTitle(): string {
        return this.title;
    }

    setTitle(title: string): void {
        this.title = title;
        this.notifySubscribersAboutTitleChange();
    }

    subscribeToTitleChange(cb: (title: string) => void): () => void {
        this.titleChangeSubscribers.add(cb);
        return () => {
            this.titleChangeSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutTitleChange(): void {
        this.titleChangeSubscribers.forEach((subscriber) => {
            subscriber(this.title);
        });
    }

    getModule(): Module<StateType> {
        return this.module;
    }

    subscribeToImportStateChange(cb: () => void): () => void {
        this.importStateSubscribers.add(cb);
        return () => {
            this.importStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutImportStateChange(): void {
        this.importStateSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    notifySubscribersAboutSyncedSettingKeysChange(): void {
        this.syncedSettingsSubscribers.forEach((subscriber) => {
            subscriber(this.syncedSettingKeys);
        });
    }

    subscribeToModuleInstanceStateChange(cb: () => void): () => void {
        this.moduleInstanceStateSubscribers.add(cb);
        return () => {
            this.moduleInstanceStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutModuleInstanceStateChange(): void {
        this.moduleInstanceStateSubscribers.forEach((subscriber) => {
            subscriber(this.moduleInstanceState);
        });
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceState): void {
        this.moduleInstanceState = moduleInstanceState;
        this.notifySubscribersAboutModuleInstanceStateChange();
    }

    getModuleInstanceState(): ModuleInstanceState {
        return this.moduleInstanceState;
    }

    setFatalError(err: Error, errInfo: ErrorInfo): void {
        this.setModuleInstanceState(ModuleInstanceState.ERROR);
        this.fatalError = {
            err,
            errInfo,
        };
    }

    getFatalError(): {
        err: Error;
        errInfo: ErrorInfo;
    } | null {
        return this.fatalError;
    }

    reset(): Promise<void> {
        this.setModuleInstanceState(ModuleInstanceState.RESETTING);

        return new Promise((resolve) => {
            this.setDefaultState(this.cachedDefaultState as StateType, this.cachedStateStoreOptions);
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

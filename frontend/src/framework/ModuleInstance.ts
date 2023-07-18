import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannel, BroadcastChannelsDef, InputBroadcastChannelDef } from "./Broadcaster";
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
    private _broadcastChannels: Record<string, BroadcastChannel>;
    private _cachedDefaultState: StateType | null;
    private _cachedStateStoreOptions?: StateOptions<StateType>;
    private _initialSettings: InitialSettings | null;
    private inputChannelDefs: InputBroadcastChannelDef[];
    private inputChannels: Record<string, BroadcastChannel> = {};
    private workbench: Workbench;

    constructor(
        module: Module<StateType>,
        instanceNumber: number,
        broadcastChannelsDef: BroadcastChannelsDef,
        workbench: Workbench,
        inputChannelDefs: InputBroadcastChannelDef[]
    ) {
        this._id = `${module.getName()}-${instanceNumber}`;
        this._title = module.getDefaultTitle();
        this._stateStore = null;
        this._module = module;
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
        this.inputChannelDefs = inputChannelDefs;
        this.inputChannels = {};
        this.workbench = workbench;

        this._broadcastChannels = {} as Record<string, BroadcastChannel>;

        const broadcastChannelNames = Object.keys(broadcastChannelsDef);

        if (broadcastChannelNames) {
            broadcastChannelNames.forEach((channelName) => {
                const enrichedChannelName = `${this._id} - ${channelName as string}`;
                this._broadcastChannels[channelName] = workbench
                    .getBroadcaster()
                    .registerChannel(
                        enrichedChannelName,
                        channelName,
                        broadcastChannelsDef[channelName as string],
                        this.id
                    );
            });
        }
    }

    getInputChannelDefs(): InputBroadcastChannelDef[] {
        return this.inputChannelDefs;
    }

    setInputChannel(inputName: string, channelName: string): void {
        const channel = this.workbench.getBroadcaster().getChannel(channelName);
        if (!channel) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this.title}'`);
        }
        this.inputChannels[inputName] = channel;
        this.notifySubscribersAboutInputChannelChange(inputName);
        this.notifySubscribersAboutInputChannelsChange();
    }

    removeInputChannel(inputName: string): void {
        delete this.inputChannels[inputName];
        this.notifySubscribersAboutInputChannelChange(inputName);
        this.notifySubscribersAboutInputChannelsChange();
    }

    getInputChannel(inputName: string): BroadcastChannel | null {
        if (!this.inputChannels[inputName]) {
            return null;
        }
        return this.inputChannels[inputName];
    }

    getInputChannels(): Record<string, BroadcastChannel> {
        return this.inputChannels;
    }

    public getBroadcastChannel(channelName: string): BroadcastChannel {
        if (!this.broadcastChannels[channelName]) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this.title}'`);
        }

        return this._broadcastChannels[channelName];
    }

    public getBroadcastChannels(): Record<string, BroadcastChannel> {
        return this.broadcastChannels;
    }

    public hasBroadcastChannels(): boolean {
        return Object.keys(this.broadcastChannels).length > 0;
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

    public subscribeToInputChannelsChange(cb: () => void): () => void {
        this.inputChannelsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb();

        return () => {
            this.inputChannelsSubscribers.delete(cb);
        };
    }

    public subscribeToInputChannelChange(
        inputName: string,
        cb: (channel: BroadcastChannel | null) => void
    ): () => void {
        if (!this.inputChannelSubscribers[inputName]) {
            this.inputChannelSubscribers[inputName] = new Set();
        }

        this.inputChannelSubscribers[inputName].add(cb);

        cb(this.getInputChannel(inputName));

        return () => {
            this.inputChannelSubscribers[inputName].delete(cb);
        };
    }

    public isInitialised(): boolean {
        return this.initialised;
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

    public notifySubscribersAboutInputChannelChange(inputName: string): void {
        if (!this.inputChannelSubscribers[inputName]) {
            return;
        }
        this.inputChannelSubscribers[inputName].forEach((subscriber) => {
            subscriber(this.getInputChannel(inputName));
        });
    }

    public notifySubscribersAboutInputChannelsChange(): void {
        this.inputChannelsSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    public subscribeToModuleInstanceStateChange(cb: () => void): () => void {
        this.moduleInstanceStateSubscribers.add(cb);
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

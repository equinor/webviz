import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannel, BroadcastChannelsDef, InputBroadcastChannelDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ImportState, Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { Channel, ChannelListener, ModuleBroadcastService, ModuleChannelListener } from "./NewBroadcaster";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

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
    private _inputChannelSubscribers: Record<string, Set<(channel: BroadcastChannel | null) => void>>;
    private _inputChannelsSubscribers: Set<() => void>;
    private _titleChangeSubscribers: Set<(title: string) => void>;
    private _broadcastChannels: Record<string, BroadcastChannel>;
    private _cachedDefaultState: StateType | null;
    private _cachedStateStoreOptions?: StateOptions<StateType>;
    private _initialSettings: InitialSettings | null;
    private _statusController: ModuleInstanceStatusControllerInternal;
    private _inputChannelDefs: InputBroadcastChannelDef[];
    private _inputChannels: Record<string, BroadcastChannel> = {};
    private _workbench: Workbench;
    private _broadcaster: ModuleBroadcastService;

    constructor(options: {
        module: Module<StateType>;
        instanceNumber: number;
        broadcastChannelsDef: BroadcastChannelsDef;
        workbench: Workbench;
        inputChannelDefs: InputBroadcastChannelDef[];

        channels: Channel[];
        channelListeners: ChannelListener[];
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
        this._inputChannelSubscribers = {};
        this._inputChannelsSubscribers = new Set();
        this._moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this._fatalError = null;
        this._cachedDefaultState = null;
        this._initialSettings = null;
        this._statusController = new ModuleInstanceStatusControllerInternal();
        this._inputChannelDefs = options.inputChannelDefs;
        this._inputChannels = {};
        this._workbench = options.workbench;

        this._broadcaster = new ModuleBroadcastService(this._id);

        options.channelListeners.forEach((channelListener) => {
            this._broadcaster.registerListener({
                ident: channelListener.ident,
                name: channelListener.name,
                supportedGenres: channelListener.supportedGenres,
                multiTasking: channelListener.multiTasking ?? false,
            });
        });

        options.channels.forEach((channel) => {
            this._broadcaster.registerChannel({
                ident: channel.ident,
                name: channel.name,
                genre: channel.genre,
                contentType: channel.contentType,
            });
        });

        this._broadcastChannels = {} as Record<string, BroadcastChannel>;

        const broadcastChannelNames = Object.keys(options.broadcastChannelsDef);

        if (broadcastChannelNames) {
            broadcastChannelNames.forEach((channelName) => {
                const enrichedChannelName = `${this._id} - ${channelName as string}`;
                this._broadcastChannels[channelName] = options.workbench
                    .getBroadcaster()
                    .registerChannel(
                        enrichedChannelName,
                        channelName,
                        options.broadcastChannelsDef[channelName as string],
                        this._id
                    );
            });
        }
    }

    getBroadcaster(): ModuleBroadcastService {
        return this._broadcaster;
    }

    getInputChannelDefs(): InputBroadcastChannelDef[] {
        return this._inputChannelDefs;
    }

    setInputChannel(inputName: string, channelName: string): void {
        const channel = this._workbench.getBroadcaster().getChannel(channelName);
        if (!channel) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this._title}'`);
        }
        this._inputChannels[inputName] = channel;
        this.notifySubscribersAboutInputChannelChange(inputName);
        this.notifySubscribersAboutInputChannelsChange();
    }

    removeInputChannel(inputName: string): void {
        delete this._inputChannels[inputName];
        this.notifySubscribersAboutInputChannelChange(inputName);
        this.notifySubscribersAboutInputChannelsChange();
    }

    getInputChannel(inputName: string): BroadcastChannel | null {
        if (!this._inputChannels[inputName]) {
            return null;
        }
        return this._inputChannels[inputName];
    }

    getInputChannels(): Record<string, BroadcastChannel> {
        return this._inputChannels;
    }

    getBroadcastChannel(channelName: string): BroadcastChannel {
        if (!this._broadcastChannels[channelName]) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this._title}'`);
        }

        return this._broadcastChannels[channelName];
    }

    getBroadcastChannels(): Record<string, BroadcastChannel> {
        return this._broadcastChannels;
    }

    hasBroadcastChannels(): boolean {
        return this._broadcaster.getChannels().length > 0;
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

    subscribeToInputChannelsChange(cb: () => void): () => void {
        this._inputChannelsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb();

        return () => {
            this._inputChannelsSubscribers.delete(cb);
        };
    }

    subscribeToInputChannelChange(inputName: string, cb: (channel: BroadcastChannel | null) => void): () => void {
        if (!this._inputChannelSubscribers[inputName]) {
            this._inputChannelSubscribers[inputName] = new Set();
        }

        this._inputChannelSubscribers[inputName].add(cb);

        cb(this.getInputChannel(inputName));

        return () => {
            this._inputChannelSubscribers[inputName].delete(cb);
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

    notifySubscribersAboutInputChannelsChange(): void {
        this._inputChannelsSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    notifySubscribersAboutInputChannelChange(inputName: string): void {
        if (!this._inputChannelSubscribers[inputName]) {
            return;
        }
        this._inputChannelSubscribers[inputName].forEach((subscriber) => {
            subscriber(this.getInputChannel(inputName));
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

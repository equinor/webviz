import { ErrorInfo } from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannel, BroadcastChannelInputDef, BroadcastChannelsDef } from "./Broadcaster";
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
    private inputChannelSubscribers: Record<string, Set<(channel: BroadcastChannel | null) => void>>;
    private titleChangeSubscribers: Set<(title: string) => void>;
    private broadcastChannels: Record<string, BroadcastChannel>;
    private cachedInitialState: StateType | null;
    private cachedStateStoreOptions?: StateOptions<StateType>;
    private channelInputDefs: BroadcastChannelInputDef[];
    private channelInputs: Record<string, BroadcastChannel> = {};
    private workbench: Workbench;

    constructor(
        module: Module<StateType>,
        instanceNumber: number,
        broadcastChannelsDef: BroadcastChannelsDef,
        workbench: Workbench,
        channelInputDefs: BroadcastChannelInputDef[]
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
        this.inputChannelSubscribers = {};
        this.moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this.fatalError = null;
        this.cachedInitialState = null;
        this.channelInputDefs = channelInputDefs;
        this.channelInputs = {};
        this.workbench = workbench;

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

    getInputChannelDefs(): BroadcastChannelInputDef[] {
        return this.channelInputDefs;
    }

    setInputChannel(inputName: string, channelName: string): void {
        const channel = this.workbench.getBroadcaster().getChannel(channelName);
        if (!channel) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this.title}'`);
        }
        this.channelInputs[inputName] = channel;
        this.notifySubscribersAboutInputChannelChange(inputName);
    }

    getInputChannel(inputName: string): BroadcastChannel | null {
        if (!this.channelInputs[inputName]) {
            return null;
        }
        return this.channelInputs[inputName];
    }

    getInputChannels(): Record<string, BroadcastChannel> {
        return this.channelInputs;
    }

    public getBroadcastChannel(channelName: string): BroadcastChannel {
        if (!this.broadcastChannels[channelName]) {
            throw new Error(`Channel '${channelName}' does not exist on module '${this.title}'`);
        }

        return this.broadcastChannels[channelName];
    }

    public getBroadcastChannels(): Record<string, BroadcastChannel> {
        return this.broadcastChannels;
    }

    public hasBroadcastChannels(): boolean {
        return Object.keys(this.broadcastChannels).length > 0;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        if (this.cachedInitialState === null) {
            this.cachedInitialState = initialState;
            this.cachedStateStoreOptions = options;
        }

        this.stateStore = new StateStore<StateType>(cloneDeep(initialState), options);
        this.context = new ModuleContext<StateType>(this, this.stateStore);
        this.initialised = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    public addSyncedSetting(settingKey: SyncSettingKey): void {
        this.syncedSettingKeys.push(settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    public getSyncedSettingKeys(): SyncSettingKey[] {
        return this.syncedSettingKeys;
    }

    public isSyncedSetting(settingKey: SyncSettingKey): boolean {
        return this.syncedSettingKeys.includes(settingKey);
    }

    public removeSyncedSetting(settingKey: SyncSettingKey): void {
        this.syncedSettingKeys = this.syncedSettingKeys.filter((a) => a !== settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    public subscribeToSyncedSettingKeysChange(cb: (syncedSettings: SyncSettingKey[]) => void): () => void {
        this.syncedSettingsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb(this.syncedSettingKeys);

        return () => {
            this.syncedSettingsSubscribers.delete(cb);
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

    public getViewFC(): ModuleFC<StateType> {
        return this.module.viewFC;
    }

    public getSettingsFC(): ModuleFC<StateType> {
        return this.module.settingsFC;
    }

    public getImportState(): ImportState {
        return this.module.getImportState();
    }

    public getContext(): ModuleContext<StateType> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.title}.'?`;
        }
        return this.context;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.module.getName();
    }

    public getTitle(): string {
        return this.title;
    }

    public setTitle(title: string): void {
        this.title = title;
        this.notifySubscribersAboutTitleChange();
    }

    public subscribeToTitleChange(cb: (title: string) => void): () => void {
        this.titleChangeSubscribers.add(cb);
        return () => {
            this.titleChangeSubscribers.delete(cb);
        };
    }

    public notifySubscribersAboutTitleChange(): void {
        this.titleChangeSubscribers.forEach((subscriber) => {
            subscriber(this.title);
        });
    }

    public getModule(): Module<StateType> {
        return this.module;
    }

    public subscribeToImportStateChange(cb: () => void): () => void {
        this.importStateSubscribers.add(cb);
        return () => {
            this.importStateSubscribers.delete(cb);
        };
    }

    public notifySubscribersAboutImportStateChange(): void {
        this.importStateSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    public notifySubscribersAboutSyncedSettingKeysChange(): void {
        this.syncedSettingsSubscribers.forEach((subscriber) => {
            subscriber(this.syncedSettingKeys);
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

    public subscribeToModuleInstanceStateChange(cb: () => void): () => void {
        this.moduleInstanceStateSubscribers.add(cb);
        return () => {
            this.moduleInstanceStateSubscribers.delete(cb);
        };
    }

    public notifySubscribersAboutModuleInstanceStateChange(): void {
        this.moduleInstanceStateSubscribers.forEach((subscriber) => {
            subscriber(this.moduleInstanceState);
        });
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceState): void {
        this.moduleInstanceState = moduleInstanceState;
        this.notifySubscribersAboutModuleInstanceStateChange();
    }

    public getModuleInstanceState(): ModuleInstanceState {
        return this.moduleInstanceState;
    }

    public setFatalError(err: Error, errInfo: ErrorInfo): void {
        this.setModuleInstanceState(ModuleInstanceState.ERROR);
        this.fatalError = {
            err,
            errInfo,
        };
    }

    public getFatalError(): {
        err: Error;
        errInfo: ErrorInfo;
    } | null {
        return this.fatalError;
    }

    public reset(): Promise<void> {
        this.setModuleInstanceState(ModuleInstanceState.RESETTING);

        return new Promise((resolve) => {
            this.setInitialState(this.cachedInitialState as StateType, this.cachedStateStoreOptions);
            resolve();
        });
    }
}

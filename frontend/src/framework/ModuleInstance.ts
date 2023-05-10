import { BroadcastChannel, BroadcastChannelsDef, broadcaster } from "./Broadcaster";
import { ImportState, Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

export class ModuleInstance<StateType extends StateBaseType, BCD extends BroadcastChannelsDef = never> {
    private id: string;
    private name: string;
    private initialised: boolean;
    private syncedSettingKeys: SyncSettingKey[];
    private stateStore: StateStore<StateType> | null;
    private module: Module<StateType, BCD>;
    private context: ModuleContext<StateType, BCD> | null;
    private importStateSubscribers: Set<() => void>;
    private syncedSettingsSubscribers: Set<(syncedSettings: SyncSettingKey[]) => void>;
    private broadcastChannels: Record<keyof BCD, BroadcastChannel<any>>;

    constructor(module: Module<StateType, BCD>, instanceNumber: number, broadcastChannelsDef: BroadcastChannelsDef) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = null;
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
        this.initialised = false;
        this.syncedSettingKeys = [];
        this.syncedSettingsSubscribers = new Set();

        this.broadcastChannels = {} as Record<keyof BCD, BroadcastChannel<any>>;

        const broadcastChannelNames = Object.keys(broadcastChannelsDef) as (keyof BCD)[];

        if (broadcastChannelNames) {
            broadcastChannelNames.forEach((channelName) => {
                const enrichedChannelName = `${this.id} - ${channelName as string}`;
                this.broadcastChannels[channelName] = broadcaster.registerChannel<BCD[typeof channelName]>(
                    enrichedChannelName,
                    broadcastChannelsDef[channelName as string]
                );
            });
        }
    }

    public getBroadcastChannel<Channel extends keyof BCD>(channelName: keyof BCD): BroadcastChannel<BCD[Channel]> {
        return this.broadcastChannels[channelName];
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.stateStore = new StateStore<StateType>(initialState, options);
        this.context = new ModuleContext<StateType, BCD>(this, this.stateStore);
        this.initialised = true;
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

    public isInitialised(): boolean {
        return this.initialised;
    }

    public getViewFC(): ModuleFC<StateType, BCD> {
        return this.module.viewFC;
    }

    public getSettingsFC(): ModuleFC<StateType, BCD> {
        return this.module.settingsFC;
    }

    public getImportState(): ImportState {
        return this.module.getImportState();
    }

    public getContext(): ModuleContext<StateType, BCD> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
        return this.context;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getModule(): Module<StateType, BCD> {
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
}

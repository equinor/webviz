import { ImportState, Module, ModuleFC, SyncSettings } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";

export class ModuleInstance<StateType extends StateBaseType> {
    private id: string;
    private name: string;
    private initialised: boolean;
    private syncedSettings: SyncSettings[];
    private stateStore: StateStore<StateType> | null;
    private module: Module<StateType>;
    private context: ModuleContext<StateType> | null;
    private importStateSubscribers: Set<() => void>;
    private syncedSettingsSubscribers: Set<(syncedSettings: SyncSettings[]) => void>;

    constructor(module: Module<StateType>, instanceNumber: number) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = null;
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
        this.initialised = false;
        this.syncedSettings = [];
        this.syncedSettingsSubscribers = new Set();
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.stateStore = new StateStore<StateType>(initialState, options);
        this.context = new ModuleContext<StateType>(this, this.stateStore);
        this.initialised = true;
    }

    public syncSetting(setting: SyncSettings): void {
        this.syncedSettings.push(setting);
        this.notifySubscribersAboutSyncedSettingsChange();
    }

    public getSyncedSettings(): SyncSettings[] {
        return this.syncedSettings;
    }

    public isSyncedSetting(setting: SyncSettings): boolean {
        return this.syncedSettings.includes(setting);
    }

    public unsyncSetting(setting: SyncSettings): void {
        this.syncedSettings = this.syncedSettings.filter((a) => a !== setting);
        this.notifySubscribersAboutSyncedSettingsChange();
    }

    public subscribeToSyncedSettingsChange(cb: (syncedSettings: SyncSettings[]) => void): () => void {
        this.syncedSettingsSubscribers.add(cb);
        return () => {
            this.syncedSettingsSubscribers.delete(cb);
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

    public notifySubscribersAboutSyncedSettingsChange(): void {
        this.syncedSettingsSubscribers.forEach((subscriber) => {
            subscriber(this.syncedSettings);
        });
    }
}

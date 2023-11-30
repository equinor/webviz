import React from "react";

import { cloneDeep } from "lodash";

import { ChannelDefinitions, SubscriberDefinitions } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { WorkbenchSettings } from "./WorkbenchSettings";

export type ModuleFCProps<
    TStateType extends StateBaseType,
    TChannelDefs extends ChannelDefinitions | never = never,
    TSubscriberDefs extends SubscriberDefinitions | never = never
> = {
    moduleContext: ModuleContext<TStateType, TChannelDefs, TSubscriberDefs>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleFC<
    TStateType extends StateBaseType,
    TChannelDefs extends ChannelDefinitions,
    TSubscriberDefs extends SubscriberDefinitions
> = React.FC<ModuleFCProps<TStateType, TChannelDefs, TSubscriberDefs>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export class Module<
    StateType extends StateBaseType,
    TChannelDefs extends ChannelDefinitions | never,
    TSubscriberDefs extends SubscriberDefinitions | never
> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleFC<StateType, TChannelDefs, TSubscriberDefs>;
    public settingsFC: ModuleFC<StateType, TChannelDefs, TSubscriberDefs>;
    protected _importState: ImportState;
    private _moduleInstances: ModuleInstance<StateType, TChannelDefs, TSubscriberDefs>[];
    private _defaultState: StateType | null;
    private _stateOptions: StateOptions<StateType> | undefined;
    private _workbench: Workbench | null;
    private _syncableSettingKeys: SyncSettingKey[];
    private _drawPreviewFunc: DrawPreviewFunc | null;
    private _description: string | null;
    private _channels: TChannelDefs | null;
    private _subscribers: TSubscriberDefs | null;

    constructor(options: {
        name: string;
        defaultTitle: string;
        syncableSettingKeys?: SyncSettingKey[];
        drawPreviewFunc?: DrawPreviewFunc;
        description?: string;
        channels?: TChannelDefs;
        subscribers?: TSubscriberDefs;
    }) {
        this._name = options.name;
        this._defaultTitle = options.defaultTitle;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this._importState = ImportState.NotImported;
        this._moduleInstances = [];
        this._defaultState = null;
        this._workbench = null;
        this._syncableSettingKeys = options.syncableSettingKeys ?? [];
        this._drawPreviewFunc = options.drawPreviewFunc ?? null;
        this._description = options.description ?? null;
        this._channels = options.channels ?? null;
        this._subscribers = options.subscribers ?? null;
    }

    getDrawPreviewFunc(): DrawPreviewFunc | null {
        return this._drawPreviewFunc;
    }

    getImportState(): ImportState {
        return this._importState;
    }

    getName(): string {
        return this._name;
    }

    getDefaultTitle(): string {
        return this._defaultTitle;
    }

    getDescription(): string | null {
        return this._description;
    }

    setWorkbench(workbench: Workbench): void {
        this._workbench = workbench;
    }

    setDefaultState(defaultState: StateType, options?: StateOptions<StateType>): void {
        this._defaultState = defaultState;
        this._stateOptions = options;
        this._moduleInstances.forEach((instance) => {
            if (this._defaultState && !instance.isInitialised()) {
                instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
            }
        });
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(instanceNumber: number): ModuleInstance<StateType, TChannelDefs, TSubscriberDefs> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<StateType, TChannelDefs, TSubscriberDefs>({
            module: this,
            instanceNumber,
            channels: this._channels,
            subscribers: this._subscribers,
        });
        this._moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this._importState = state;
        this._moduleInstances.forEach((instance) => {
            instance.notifySubscribersAboutImportStateChange();
        });

        if (this._workbench && state === ImportState.Imported) {
            this._workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._defaultState && this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (this._defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this._moduleInstances.forEach((instance) => {
                    if (this._defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}

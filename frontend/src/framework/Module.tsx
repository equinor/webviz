import React from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannelMeta } from "./Broadcaster";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFCProps<S extends StateBaseType, BCM extends BroadcastChannelMeta = {}> = {
    moduleContext: ModuleContext<S, BCM>;
    workbenchServices: WorkbenchServices;
};

export type ModuleFC<S extends StateBaseType, BCM extends BroadcastChannelMeta = {}> = React.FC<ModuleFCProps<S, BCM>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export class Module<StateType extends StateBaseType, BCM extends BroadcastChannelMeta> {
    private _name: string;
    public viewFC: ModuleFC<StateType, BCM>;
    public settingsFC: ModuleFC<StateType, BCM>;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance<StateType, BCM>[];
    private initialState: StateType | null;
    private stateOptions: StateOptions<StateType> | undefined;
    private workbench: Workbench | null;
    private syncableSettingKeys: SyncSettingKey[];
    private broadcastChannelsMeta: BCM;

    constructor(name: string, syncableSettingKeys: SyncSettingKey[] = [], broadcastChannels: BCM) {
        this._name = name;
        this.numInstances = 0;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.initialState = null;
        this.workbench = null;
        this.syncableSettingKeys = syncableSettingKeys;
        this.broadcastChannelsMeta = broadcastChannels;
    }

    public getImportState(): ImportState {
        return this.importState;
    }

    public getName() {
        return this._name;
    }

    public setWorkbench(workbench: Workbench): void {
        this.workbench = workbench;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.initialState = initialState;
        this.stateOptions = options;
        this.moduleInstances.forEach((instance) => {
            if (this.initialState && !instance.isInitialised()) {
                instance.setInitialState(cloneDeep(this.initialState), cloneDeep(this.stateOptions));
            }
        });
    }

    public getSyncableSettingKeys(): SyncSettingKey[] {
        return this.syncableSettingKeys;
    }

    public makeInstance(): ModuleInstance<StateType, BCM> {
        const instance = new ModuleInstance<StateType, BCM>(this, this.numInstances++, this.broadcastChannelsMeta);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this.importState = state;
        this.moduleInstances.forEach((instance) => {
            instance.notifySubscribersAboutImportStateChange();
        });

        if (this.workbench && state === ImportState.Imported) {
            this.workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private maybeImportSelf(): void {
        if (this.importState !== ImportState.NotImported) {
            if (this.initialState && this.importState === ImportState.Imported) {
                this.moduleInstances.forEach((instance) => {
                    if (this.initialState && !instance.isInitialised()) {
                        instance.setInitialState(cloneDeep(this.initialState), cloneDeep(this.stateOptions));
                    }
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this.moduleInstances.forEach((instance) => {
                    if (this.initialState && !instance.isInitialised()) {
                        instance.setInitialState(cloneDeep(this.initialState), cloneDeep(this.stateOptions));
                    }
                });
            })
            .catch(() => {
                this.setImportState(ImportState.Failed);
            });
    }
}

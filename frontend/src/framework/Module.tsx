import React from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannelMeta, BroadcastChannelsDef } from "./Broadcaster";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFCProps<
    S extends StateBaseType,
    ChannelNames extends string = never,
    BCM extends BroadcastChannelMeta<ChannelNames> = never
> = {
    moduleContext: ModuleContext<S, ChannelNames, BCM>;
    workbenchServices: WorkbenchServices;
};

export type ModuleFC<
    S extends StateBaseType,
    ChannelNames extends string = never,
    BCM extends BroadcastChannelMeta<ChannelNames> = never
> = React.FC<ModuleFCProps<S, ChannelNames, BCM>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export class Module<
    StateType extends StateBaseType,
    ChannelNames extends string,
    BCM extends BroadcastChannelMeta<ChannelNames>
> {
    private _name: string;
    public viewFC: ModuleFC<StateType, ChannelNames, BCM>;
    public settingsFC: ModuleFC<StateType, ChannelNames, BCM>;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance<StateType, ChannelNames, BCM>[];
    private initialState: StateType | null;
    private stateOptions: StateOptions<StateType> | undefined;
    private workbench: Workbench | null;
    private syncableSettingKeys: SyncSettingKey[];
    private channelsDef: BroadcastChannelsDef;

    constructor(
        name: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelsDef: BroadcastChannelsDef = {}
    ) {
        this._name = name;
        this.numInstances = 0;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.initialState = null;
        this.workbench = null;
        this.syncableSettingKeys = syncableSettingKeys;
        this.channelsDef = broadcastChannelsDef;
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

    public makeInstance(): ModuleInstance<StateType, ChannelNames, BCM> {
        const instance = new ModuleInstance<StateType, ChannelNames, BCM>(this, this.numInstances++, this.channelsDef);
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

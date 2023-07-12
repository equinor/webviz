import React from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannelsDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";

export type ModuleFCProps<S extends StateBaseType> = {
    moduleContext: ModuleContext<S>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    initialSettings?: InitialSettings;
};

export type ModuleFC<S extends StateBaseType> = React.FC<ModuleFCProps<S>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export class Module<StateType extends StateBaseType> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleFC<StateType>;
    public settingsFC: ModuleFC<StateType>;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance<StateType>[];
    private defaultState: StateType | null;
    private stateOptions: StateOptions<StateType> | undefined;
    private workbench: Workbench | null;
    private syncableSettingKeys: SyncSettingKey[];
    private channelsDef: BroadcastChannelsDef;
    private drawPreviewFunc: DrawPreviewFunc | null;

    constructor(
        name: string,
        defaultTitle: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelsDef: BroadcastChannelsDef = {},
        drawPreviewFunc: DrawPreviewFunc | null = null
    ) {
        this._name = name;
        this._defaultTitle = defaultTitle;
        this.numInstances = 0;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.defaultState = null;
        this.workbench = null;
        this.syncableSettingKeys = syncableSettingKeys;
        this.channelsDef = broadcastChannelsDef;
        this.drawPreviewFunc = drawPreviewFunc;
    }

    getDrawPreviewFunc(): DrawPreviewFunc | null {
        return this.drawPreviewFunc;
    }

    getImportState(): ImportState {
        return this.importState;
    }

    getName() {
        return this._name;
    }

    getDefaultTitle() {
        return this._defaultTitle;
    }

    setWorkbench(workbench: Workbench): void {
        this.workbench = workbench;
    }

    setDefaultState(defaultState: StateType, options?: StateOptions<StateType>): void {
        this.defaultState = defaultState;
        this.stateOptions = options;
        this.moduleInstances.forEach((instance) => {
            if (this.defaultState && !instance.isInitialised()) {
                instance.setDefaultState(cloneDeep(this.defaultState), cloneDeep(this.stateOptions));
            }
        });
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this.syncableSettingKeys;
    }

    makeInstance(): ModuleInstance<StateType> {
        if (!this.workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<StateType>(this, this.numInstances++, this.channelsDef, this.workbench);
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
            if (this.defaultState && this.importState === ImportState.Imported) {
                this.moduleInstances.forEach((instance) => {
                    if (this.defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this.defaultState), cloneDeep(this.stateOptions));
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
                    if (this.defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this.defaultState), cloneDeep(this.stateOptions));
                    }
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}

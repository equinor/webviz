import React from "react";

import { ModuleContext, ModuleInstance } from "./ModuleInstance";
import { StateBaseType } from "./StateStore";
import { Workbench, WorkbenchEvents } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFCProps<S extends StateBaseType> = {
    moduleContext: ModuleContext<S>;
    workbenchServices: WorkbenchServices;
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
    public viewFC: ModuleFC<StateType>;
    public settingsFC: ModuleFC<StateType>;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance<StateType>[];
    private initialState: StateType;
    private workbench: Workbench | null;

    constructor(name: string, initialState: StateType) {
        this._name = name;
        this.numInstances = 0;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.initialState = initialState;
        this.workbench = null;
    }

    public getImportState(): ImportState {
        return this.importState;
    }

    public getInitialState: () => StateType = () => this.initialState;

    public getName() {
        return this._name;
    }

    public setWorkbench(workbench: Workbench): void {
        this.workbench = workbench;
    }

    public makeInstance(): ModuleInstance<StateType> {
        const instance = new ModuleInstance<StateType>(this, this.numInstances++, this.initialState);
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
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
            })
            .catch(() => {
                this.setImportState(ImportState.Failed);
            });
    }
}

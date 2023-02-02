import React from "react";
import { ModuleContext, ModuleInstance } from "./ModuleInstance";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFC = React.FC<{
    moduleContext: ModuleContext;
    workbenchServices: WorkbenchServices;
}>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed"
}

export class Module {
    private _name: string;
    public viewFC: ModuleFC;
    public settingsFC: ModuleFC;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance[];

    constructor(name: string) {
        this._name = name;
        this.numInstances = 0;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
    }

    public getImportState(): ImportState {
        return this.importState;
    }

    public getName() {
        return this._name;
    }

    public makeInstance(): ModuleInstance {
        const instance = new ModuleInstance(this, this.numInstances++);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this.importState = state;
        this.moduleInstances.forEach((instance) => {
            instance.notifySubscribersAboutImportStateChange();
        })
    }

    private maybeImportSelf(): void {
        if (this.importState !== ImportState.NotImported) {
            return;
        }

        this.setImportState(ImportState.Importing);
        
        import(`/src/modules/${this._name}/module.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
            })
            .catch(() => {
                this.setImportState(ImportState.Failed);
            });
    }
}

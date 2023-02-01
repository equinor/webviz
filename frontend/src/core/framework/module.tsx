import React from "react";

import { StateStore } from "./state-store";
import { WorkbenchContext } from "./workbench";

export type ModuleContext = {
    useModuleState: <T>(
        key: string,
        initialState?: T
    ) => [T, (value: T) => void];
    useModuleStateValue: <T>(key: string, initialState?: T) => T;
    useSetModuleStateValue: <T>(key: string) => (newValue: T) => void;
};

export type ModuleInstance =
    | {
          id: string;
          name: string;
          View: ModuleFC;
          Settings: ModuleFC;
          stateStore: StateStore;
          loading?: false;
      }
    | { id: string; name: string; loading: true };

export type ModuleFC = React.FC<{
    moduleContext: ModuleContext;
    workbenchContext: WorkbenchContext;
}>;

export class Module {
    private _name: string;
    public view: ModuleFC;
    public settings: ModuleFC;
    private numInstances: number;

    constructor(name: string) {
        this._name = name;
        this.numInstances = 0;
        this.view = () => <div>Not defined</div>;
        this.settings = () => <div>Not defined</div>;
    }

    public get name() {
        return this._name;
    }

    public makeInstance(): ModuleInstance {
        return {
            id: `${this._name}-${this.numInstances++}`,
            name: this._name,
            View: this.view,
            Settings: this.settings,
            stateStore: new StateStore(),
        };
    }
}

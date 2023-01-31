import React from "react";

export type ModuleContext = {
    useModuleState: <T>(
        key: string,
        initialState: T
    ) => [T, (value: T) => void];
    useModuleStateValue: <T>(key: string) => T;
    useSetModuleStateValue: <T>(key: string) => (newValue: T) => void;
    // useWorkbenchData
};

export type ModuleInstance =
    | {
          id: string;
          name: string;
          View: ModuleFC;
          Settings: ModuleFC;
          stateStore: ModuleStateStore;
          loading?: false;
      }
    | { id: string; name: string; loading: true };

export type ModuleFC = React.FC<{ moduleContext: ModuleContext }>;

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
            stateStore: new ModuleStateStore(),
        };
    }
}

export class ModuleStateStore {
    private _state: { [key: string]: any } = {};

    public getState(key: string): unknown {
        return this._state[key];
    }

    public setState(key: string, value: unknown) {
        this._state[key] = value;
    }

    public useModuleState<T>(
        key: string,
        initialState: T
    ): [T, (value: T) => void] {
        if (!this._state[key]) {
            this._state[key] = initialState;
        }

        // This needs to be adjusted to module's state types
        return [
            this.getState.bind(this, key) as T,
            this.setState.bind(this, key),
        ];
    }

    public useModuleStateValue<T>(key: string): T {
        return this.getState(key) as T;
    }

    public setModuleStateValue<T>(key: string) {
        return (newValue: T) => this.setState(key, newValue);
    }
}

export class ModulePlaceholder extends Module {
    public view: ModuleFC;
    public settings: ModuleFC;

    constructor() {
        super("Placeholder");
        this.view = () => <div>Loading</div>;
        this.settings = () => <div>Loading</div>;
    }
}

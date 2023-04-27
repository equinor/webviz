import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";

export class ModuleContext<S extends StateBaseType> {
    private _moduleInstance: ModuleInstance<S>;
    private _stateStore: StateStore<S>;

    constructor(moduleInstance: ModuleInstance<S>, stateStore: StateStore<S>) {
        this._moduleInstance = moduleInstance;
        this._stateStore = stateStore;
    }

    instanceIdString(): string {
        return this._moduleInstance.getId();
    }

    // Make this an ordinary method instead, stateStore()?
    get stateStore(): StateStore<S> {
        return this._stateStore;
    }

    useStoreState<K extends keyof S>(key: K): [S[K], (value: S[K] | ((prev: S[K]) => S[K])) => void] {
        return useStoreState(this.stateStore, key);
    }

    useStoreValue<K extends keyof S>(key: K): S[K] {
        return useStoreValue(this.stateStore, key);
    }

    useSetStoreValue<K extends keyof S>(key: K): (newValue: S[K] | ((prev: S[K]) => S[K])) => void {
        return useSetStoreValue(this.stateStore, key);
    }
}

import { ImportState, Module, ModuleFC } from "./Module";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";

export type ModuleContext<S extends StateBaseType> = {
    useStoreState: (key: keyof S) => [S[keyof S], (value: S[keyof S] | ((prev: S[keyof S]) => S[keyof S])) => void];
    useStoreValue: (key: keyof S) => S[keyof S];
    useSetStoreValue: (key: keyof S) => (newValue: S[keyof S] | ((prev: S[keyof S]) => S[keyof S])) => void;
};

export class ModuleInstance<StateType extends StateBaseType> {
    private id: string;
    private name: string;
    private stateStore: StateStore<StateType>;
    private module: Module<StateType>;
    private context: ModuleContext<StateType>;
    private importStateSubscribers: Set<() => void>;

    constructor(module: Module<StateType>, instanceNumber: number, initialState: StateType) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = new StateStore<StateType>(initialState);
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = {
            useStoreState: (
                key: keyof StateType
            ): [
                StateType[keyof StateType],
                (
                    value:
                        | StateType[keyof StateType]
                        | ((prev: StateType[keyof StateType]) => StateType[keyof StateType])
                ) => void
            ] => useStoreState(this.stateStore, key),
            useStoreValue: (key: keyof StateType): StateType[keyof StateType] => useStoreValue(this.stateStore, key),
            useSetStoreValue: (
                key: keyof StateType
            ): ((
                newValue:
                    | StateType[keyof StateType]
                    | ((prev: StateType[keyof StateType]) => StateType[keyof StateType])
            ) => void) => useSetStoreValue(this.stateStore, key),
        };
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

    public getOrCreateContext(): ModuleContext<StateType> {
        return this.context;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public subscribeToImportStateChange(cb: () => void) {
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
}

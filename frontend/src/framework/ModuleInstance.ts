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
    private stateStore: StateStore<StateType> | null;
    private module: Module<StateType>;
    private context: ModuleContext<StateType> | null;
    private importStateSubscribers: Set<() => void>;

    constructor(module: Module<StateType>, instanceNumber: number) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = null;
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
    }

    public setInitialState(initialState: StateType): void {
        this.stateStore = new StateStore<StateType>(initialState);

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
            ] => useStoreState(this.stateStore as Exclude<typeof this.stateStore, null>, key),
            useStoreValue: (key: keyof StateType): StateType[keyof StateType] =>
                useStoreValue(this.stateStore as Exclude<typeof this.stateStore, null>, key),
            useSetStoreValue: (
                key: keyof StateType
            ): ((
                newValue:
                    | StateType[keyof StateType]
                    | ((prev: StateType[keyof StateType]) => StateType[keyof StateType])
            ) => void) => useSetStoreValue(this.stateStore as Exclude<typeof this.stateStore, null>, key),
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

    public getContext(): ModuleContext<StateType> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
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

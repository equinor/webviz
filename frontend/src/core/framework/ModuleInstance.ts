import { ImportState, Module, ModuleFC } from "./Module";
import { StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";

export type ModuleContext = {
    useStoreState: (key: string, initialState?: unknown) => ReturnType<typeof useStoreState>;
    useStoreValue: (key: string, initialState?: unknown) => unknown;
    useSetStoreValue: (key: string) => (newValue: unknown | ((prev: unknown) => unknown)) => void;
};

export class ModuleInstance {
    private id: string;
    private name: string;
    private stateStore: StateStore;
    private module: Module;
    private context: ModuleContext | null;
    private importStateSubscribers: Set<() => void>;

    constructor(module: Module, instanceNumber: number) {
        this.id = `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = new StateStore();
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
    }

    public getViewFC(): ModuleFC {
        return this.module.viewFC;
    }

    public getSettingsFC(): ModuleFC {
        return this.module.settingsFC;
    }

    public getImportState(): ImportState {
        return this.module.getImportState();
    }

    public getOrCreateContext(): ModuleContext {
        if (!this.context) {
            this.context = {
                useStoreState: useStoreState.bind({}, this.stateStore),
                useStoreValue: useStoreValue.bind({}, this.stateStore),
                useSetStoreValue: useSetStoreValue.bind({}, this.stateStore),
            };
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

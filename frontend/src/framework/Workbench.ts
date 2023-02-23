import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { StateStore } from "./StateStore";
import { WorkbenchServices } from "./WorkbenchServices";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";

export enum WorkbenchEvents {
    ActiveModuleChanged = "ActiveModuleChanged",
    ModuleInstancesChanged = "ModuleInstancesChanged",
    FullModuleRerenderRequested = "FullModuleRerenderRequested",
}

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
};

export type WorkbenchState = {
    modulesListOpen: boolean;
};

export class Workbench {
    private moduleInstances: ModuleInstance<any>[];
    private _activeModuleId: string;
    private stateStore: StateStore<WorkbenchState>;
    private _workbenchServices: PrivateWorkbenchServices;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private layout: LayoutElement[];

    constructor() {
        this.moduleInstances = [];
        this._activeModuleId = "";
        this.stateStore = new StateStore<WorkbenchState>({
            modulesListOpen: false,
        });
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._subscribersMap = {};
        this.layout = [];
    }

    public getStateStore(): StateStore<WorkbenchState> {
        return this.stateStore;
    }

    public getLayout(): LayoutElement[] {
        return this.layout;
    }

    public getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    public getActiveModuleId(): string {
        return this._activeModuleId;
    }

    public getActiveModuleName(): string {
        return (
            this.moduleInstances.find((moduleInstance) => moduleInstance.getId() === this._activeModuleId)?.getName() ||
            ""
        );
    }

    public setActiveModuleId(id: string) {
        this._activeModuleId = id;
        this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
    }

    private notifySubscribers(event: WorkbenchEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: WorkbenchEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    public getModuleInstances(): ModuleInstance<any>[] {
        return this.moduleInstances;
    }

    public makeLayout(layout: LayoutElement[]): void {
        this.moduleInstances = [];
        this.layout = layout;
        layout.forEach((element, index: number) => {
            this.addModuleToLayout(element.moduleName, index);
        });
    }

    public makeModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const moduleInstance = module.makeInstance();
        this.moduleInstances.push(moduleInstance);
        this.layout.push({ ...layout, moduleInstanceId: moduleInstance.getId() });
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        module.setWorkbench(this);
        this._activeModuleId = moduleInstance.getId();
        this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        return moduleInstance;
    }

    public removeModuleInstance(moduleInstanceId: string): void {
        this.moduleInstances = this.moduleInstances.filter((el) => el.getId() !== moduleInstanceId);
        this.layout = this.layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        if (this._activeModuleId === moduleInstanceId) {
            this._activeModuleId = "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    private addModuleToLayout(moduleName: string, elementIndex: number): void {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const moduleInstance = module.makeInstance();
        this.moduleInstances.push(moduleInstance);
        this.layout[elementIndex] = { ...this.layout[elementIndex], moduleInstanceId: moduleInstance.getId() };
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        module.setWorkbench(this);
    }

    public setLayout(layout: LayoutElement[]): void {
        this.layout = layout;
        this.notifySubscribers(WorkbenchEvents.FullModuleRerenderRequested);
    }

    public maybeMakeFirstModuleInstanceActive(): void {
        if (!this.moduleInstances.some((el) => el.getId() === this._activeModuleId)) {
            this._activeModuleId =
                this.moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
    }

    // Temporary, for testing
    public setNavigatorFieldName(fieldName: string) {
        this._workbenchServices.publishNavigatorData("navigator.fieldName", fieldName);
    }

    // Temporary, for testing
    public setNavigatorCaseId(caseId: string) {
        this._workbenchServices.publishNavigatorData("navigator.caseId", caseId);
    }
}

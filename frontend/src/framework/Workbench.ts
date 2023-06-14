import { QueryClient } from "@tanstack/react-query";

import { EnsembleIdent } from "./EnsembleIdent";
import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { StateStore } from "./StateStore";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { loadEnsembleSetMetadataFromBackend } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";

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

export type WorkbenchGuiState = {
    modulesListOpen: boolean;
    syncSettingsActive: boolean;
};

export class Workbench {
    private moduleInstances: ModuleInstance<any>[];
    private _activeModuleId: string;
    private guiStateStore: StateStore<WorkbenchGuiState>;
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private layout: LayoutElement[];

    constructor() {
        this.moduleInstances = [];
        this._activeModuleId = "";
        this.guiStateStore = new StateStore<WorkbenchGuiState>({
            modulesListOpen: false,
            syncSettingsActive: false,
        });
        this._workbenchSession = new WorkbenchSessionPrivate(this);
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._subscribersMap = {};
        this.layout = [];
    }

    public loadLayoutFromLocalStorage(): boolean {
        const layoutString = localStorage.getItem("layout");
        if (!layoutString) return false;

        const layout = JSON.parse(layoutString) as LayoutElement[];
        this.makeLayout(layout);
        return true;
    }

    public getGuiStateStore(): StateStore<WorkbenchGuiState> {
        return this.guiStateStore;
    }

    public getLayout(): LayoutElement[] {
        return this.layout;
    }

    public getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
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

    public getModuleInstance(id: string): ModuleInstance<any> | undefined {
        return this.moduleInstances.find((moduleInstance) => moduleInstance.getId() === id);
    }

    public makeLayout(layout: LayoutElement[]): void {
        this.moduleInstances = [];
        this.setLayout(layout);
        layout.forEach((element, index: number) => {
            const module = ModuleRegistry.getModule(element.moduleName);
            if (!module) {
                throw new Error(`Module ${element.moduleName} not found`);
            }

            const moduleInstance = module.makeInstance();
            this.moduleInstances.push(moduleInstance);
            this.layout[index] = { ...this.layout[index], moduleInstanceId: moduleInstance.getId() };
            this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
            module.setWorkbench(this);
        });
    }

    public makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
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
        const newLayout = this.layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        if (this._activeModuleId === moduleInstanceId) {
            this._activeModuleId = "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    public setLayout(layout: LayoutElement[]): void {
        this.layout = layout;
        this.notifySubscribers(WorkbenchEvents.FullModuleRerenderRequested);

        const modifiedLayout = layout.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });
        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
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

    public async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        specifiedEnsembles: { caseUuid: string; ensembleName: string }[]
    ): Promise<void> {
        const ensembleIdentsToLoad: EnsembleIdent[] = [];
        for (const ensSpec of specifiedEnsembles) {
            ensembleIdentsToLoad.push(new EnsembleIdent(ensSpec.caseUuid, ensSpec.ensembleName));
        }

        console.log("loadAndSetupEnsembleSetInSession - starting load");
        const newEnsembleSet = await loadEnsembleSetMetadataFromBackend(queryClient, ensembleIdentsToLoad);
        console.log("loadAndSetupEnsembleSetInSession - loading done");

        console.log("loadAndSetupEnsembleSetInSession - publishing");
        return this._workbenchSession.setEnsembleSet(newEnsembleSet);
    }
}

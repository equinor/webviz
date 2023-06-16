import { Ensemble } from "@shared-types/ensemble";

import { Broadcaster } from "./Broadcaster";
import { Layout } from "./Layout";
import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { StateStore } from "./StateStore";
import { WorkbenchServices } from "./WorkbenchServices";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";

export enum WorkbenchEvents {
    ModuleInstancesChanged = "ModuleInstancesChanged",
}

export type WorkbenchDataState = {
    selectedEnsembles: Ensemble[];
};

export type WorkbenchGuiState = {
    modulesListOpen: boolean;
    syncSettingsActive: boolean;
};

export class Workbench {
    private moduleInstances: ModuleInstance<any>[];
    private guiStateStore: StateStore<WorkbenchGuiState>;
    private dataStateStore: StateStore<WorkbenchDataState>;
    private _workbenchServices: PrivateWorkbenchServices;
    private _broadcaster: Broadcaster;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private _layout: Layout;

    constructor() {
        this.moduleInstances = [];
        this.guiStateStore = new StateStore<WorkbenchGuiState>({
            modulesListOpen: false,
            syncSettingsActive: false,
        });
        this.dataStateStore = new StateStore<WorkbenchDataState>({
            selectedEnsembles: [],
        });
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._broadcaster = new Broadcaster();
        this._subscribersMap = {};
        this._layout = new Layout(this);
    }

    public getGuiStateStore(): StateStore<WorkbenchGuiState> {
        return this.guiStateStore;
    }

    public getDataStateStore(): StateStore<WorkbenchDataState> {
        return this.dataStateStore;
    }

    public getLayout(): Layout {
        return this._layout;
    }

    public getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    public getBroadcaster(): Broadcaster {
        return this._broadcaster;
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

    public addModuleInstance(moduleInstance: ModuleInstance<any>): void {
        this.moduleInstances.push(moduleInstance);
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    public getModuleInstances(): ModuleInstance<any>[] {
        return this.moduleInstances;
    }

    public getModuleInstance(id: string): ModuleInstance<any> | undefined {
        return this.moduleInstances.find((moduleInstance) => moduleInstance.getId() === id);
    }

    public removeModuleInstance(moduleInstanceId: string): void {
        this._broadcaster.unregisterAllChannelsForModuleInstance(moduleInstanceId);
        this.moduleInstances = this.moduleInstances.filter((el) => el.getId() !== moduleInstanceId);
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    public maybeMakeFirstModuleInstanceActive(): void {
        const activeModuleInstanceId = this._layout.getActiveModuleInstanceId();
        if (!this.moduleInstances.some((el) => el.getId() === activeModuleInstanceId)) {
            const newActiveModuleInstanceId =
                this.moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this._layout.setActiveModuleInstanceId(newActiveModuleInstanceId);
        }
    }

    public setNavigatorEnsembles(ensemblesArr: { caseUuid: string; caseName: string; ensembleName: string }[]) {
        this._workbenchServices.publishNavigatorData("navigator.ensembles", ensemblesArr);
    }
}

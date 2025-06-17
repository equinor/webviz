import { v4 } from "uuid";

import type { AtomStoreMaster } from "./AtomStoreMaster";
import type { ModuleInstance, ModuleInstanceFullState } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
    minimized?: boolean;
    maximized?: boolean;
};

export type ModuleInstanceStateAndLayoutInfo = ModuleInstanceFullState<any> & {
    layoutInfo: Omit<LayoutElement, "moduleInstanceId" | "moduleName">;
};

export type SerializedDashboard = {
    id: string;
    name: string;
    description?: string;
    moduleInstances: ModuleInstanceStateAndLayoutInfo[];
};

export enum DashboardEvent {
    LayoutChanged = "LayoutChanged",
    ModuleInstancesChanged = "ModuleInstancesChanged",
}

export class Dashboard {
    private _id: string;
    private _name: string;
    private _description?: string;
    private _layout: LayoutElement[] = [];
    private _moduleInstances: ModuleInstance<any, any>[] = [];
    private _subscribersMap: Map<string, Set<() => void>> = new Map();
    private _atomStoreMaster: AtomStoreMaster;

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._id = v4();
        this._name = "New Dashboard";
        this._atomStoreMaster = atomStoreMaster;
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
    }

    registerModuleInstance(moduleInstance: ModuleInstance<any, any>): void {
        this._moduleInstances.push(moduleInstance);
        this._atomStoreMaster.makeAtomStoreForModuleInstance(moduleInstance.getId());
        this.notifySubscribers(DashboardEvent.ModuleInstancesChanged);
    }

    static fromPersistedState(serializedDashboard: SerializedDashboard, atomStoreMaster: AtomStoreMaster): Dashboard {
        const dashboard = new Dashboard(atomStoreMaster);
        dashboard._id = serializedDashboard.id;
        dashboard._name = serializedDashboard.name;
        dashboard._description = serializedDashboard.description;

        const layout: LayoutElement[] = [];

        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { id, name, layoutInfo } = serializedInstance;

            const module = ModuleRegistry.getModule(name);
            if (!module) {
                throw new Error(`Module ${name} not found`);
            }
            const moduleInstance = module.makeInstance(id);
            moduleInstance.setFullState(serializedInstance);
            dashboard.registerModuleInstance(moduleInstance);

            layout.push({
                moduleInstanceId: id,
                moduleName: name,
                relX: layoutInfo.relX,
                relY: layoutInfo.relY,
                relHeight: layoutInfo.relHeight,
                relWidth: layoutInfo.relWidth,
                minimized: layoutInfo.minimized,
                maximized: layoutInfo.maximized,
            });
        }

        dashboard.setLayout(layout);

        return dashboard;
    }

    private notifySubscribers(event: DashboardEvent): void {
        const subscribers = this._subscribersMap.get(event);
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: DashboardEvent, cb: () => void) {
        const subscribersSet = this._subscribersMap.get(event) ?? new Set();
        subscribersSet.add(cb);
        this._subscribersMap.set(event, subscribersSet);

        return () => {
            subscribersSet.delete(cb);
        };
    }
}

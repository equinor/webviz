import { v4 } from "uuid";

import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { Workbench } from "./Workbench";

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
};

export type LayoutPage = {
    uuid: string;
    name: string;
    layout: LayoutElement[];
};

export enum LayoutEvents {
    ActivePageChanged = "ActivePageChanged",
    PageLayoutChanged = "PageLayoutChanged",
    ActiveModuleInstanceChanged = "ActiveModuleInstanceChanged",
    FullModuleRerenderRequested = "FullModuleRerenderRequested",
}

const defaultLayout: LayoutPage[] = [
    {
        uuid: v4(),
        name: "Page 1",
        layout: [],
    },
];

export class Layout {
    private _pages: LayoutPage[];
    private _activePageUuid: string | null;
    private _activeModuleInstanceId: string | null;
    private _workbench: Workbench;
    private _subscribersMap: { [key: string]: Set<() => void> };

    constructor(workbench: Workbench) {
        this._pages = [];
        this._activePageUuid = null;
        this._activeModuleInstanceId = null;
        this._workbench = workbench;
        this._subscribersMap = {};

        this.loadFromLocalStorage();
    }

    private findPageByUuid(uuid: string): LayoutPage | null {
        return this._pages.find((page) => page.uuid === uuid) ?? null;
    }

    loadFromLocalStorage(): boolean {
        const layoutString = localStorage.getItem("layout");
        const activePageUuid = localStorage.getItem("activePageUuid") ?? null;
        const activeModuleInstanceId = localStorage.getItem("activeModuleInstanceId") ?? null;

        if (!layoutString) {
            this._pages = defaultLayout;
            this._activePageUuid = this._pages[0].uuid;
            this._activeModuleInstanceId = null;
            this.notifySubscribers(LayoutEvents.PageLayoutChanged);
            this.notifySubscribers(LayoutEvents.ActivePageChanged);
            this.notifySubscribers(LayoutEvents.ActiveModuleInstanceChanged);
            return false;
        }

        this._pages = JSON.parse(layoutString) as LayoutPage[];
        this._activePageUuid = activePageUuid;

        if (!this.findPageByUuid(activePageUuid || "") && this._pages.length > 0) {
            this._activePageUuid = this._pages[0].uuid;
        }

        this.makeModuleInstancesForActivePage();

        this._activeModuleInstanceId = activeModuleInstanceId;

        this.notifySubscribers(LayoutEvents.PageLayoutChanged);
        this.notifySubscribers(LayoutEvents.ActivePageChanged);
        this.notifySubscribers(LayoutEvents.ActiveModuleInstanceChanged);

        return true;
    }

    saveToLocalStorage(): void {
        const modifiedLayout = this._pages.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });

        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
        localStorage.setItem("activePageUuid", this._activePageUuid || "");
        localStorage.setItem("activeModuleInstanceId", this._activeModuleInstanceId || "");
    }

    addPage(): void {
        const name = `Page ${this._pages.length + 1}`;
        const uuid = v4();
        this._pages.push({
            uuid,
            name,
            layout: [],
        });
        this._activePageUuid = uuid;
        this.notifySubscribers(LayoutEvents.PageLayoutChanged);
        this.notifySubscribers(LayoutEvents.ActivePageChanged);
        this.saveToLocalStorage();
    }

    removePage(uuid: string): void {
        const index = this._pages.findIndex((page) => page.uuid === uuid);
        if (index !== -1) {
            this._pages.splice(index, 1);

            const newPageIndex = Math.max(0, index - 1);
            this._activePageUuid = this._pages.length > 0 ? this._pages[newPageIndex].uuid : null;
        }
        this.notifySubscribers(LayoutEvents.PageLayoutChanged);
        this.notifySubscribers(LayoutEvents.ActivePageChanged);
        this.saveToLocalStorage();
    }

    getPages(): LayoutPage[] {
        return this._pages;
    }

    setPageName(uuid: string, name: string): void {
        const page = this.findPageByUuid(uuid);
        if (page) {
            page.name = name;
        }
        this.saveToLocalStorage();
    }

    setActivePageLayout(layout: LayoutElement[]): void {
        const page = this.findPageByUuid(this._activePageUuid || "");
        if (page) {
            this.setPageLayout(page.uuid, layout);
        }
    }

    setPageLayout(uuid: string, layout: LayoutElement[]): void {
        const page = this.findPageByUuid(uuid);
        if (page) {
            page.layout = layout;
        }
        this.saveToLocalStorage();
        this.notifySubscribers(LayoutEvents.FullModuleRerenderRequested);
        this.notifySubscribers(LayoutEvents.PageLayoutChanged);
    }

    getActivePageUuid(): string | null {
        return this._activePageUuid;
    }

    setActivePageUuid(uuid: string): void {
        this._activePageUuid = uuid;
        this.makeModuleInstancesForActivePage();
        this.saveToLocalStorage();
        this.notifySubscribers(LayoutEvents.ActivePageChanged);
    }

    getActiveModuleInstanceId(): string | null {
        return this._activeModuleInstanceId;
    }

    getPageLayout(uuid: string): LayoutElement[] {
        const page = this.findPageByUuid(uuid);
        return page ? page.layout : [];
    }

    getActivePageLayout(): LayoutElement[] {
        const page = this.findPageByUuid(this._activePageUuid || "");
        return page ? page.layout : [];
    }

    setActiveModuleInstanceId(moduleInstanceId: string): void {
        this._activeModuleInstanceId = moduleInstanceId;
        this.saveToLocalStorage();
        this.notifySubscribers(LayoutEvents.ActiveModuleInstanceChanged);
    }

    private makeModuleInstancesForActivePage(): void {
        const page = this.findPageByUuid(this._activePageUuid || "");
        if (!page) return;

        page.layout.forEach((el, index) => {
            if (this._workbench.getModuleInstance(el.moduleInstanceId ?? "")) return;

            const module = ModuleRegistry.getModule(el.moduleName);
            if (!module) {
                throw new Error(`Module ${el.moduleName} not found`);
            }

            module.setWorkbench(this._workbench);
            const moduleInstance = module.makeInstance();
            this._workbench.addModuleInstance(moduleInstance);
            page.layout[index] = { ...page.layout[index], moduleInstanceId: moduleInstance.getId() };
        });
    }

    removeModuleInstance(moduleInstanceId: string): void {
        const page = this._pages.find((page) => page.layout.some((el) => el.moduleInstanceId === moduleInstanceId));
        if (!page) return;

        const moduleInstanceIndex = page.layout.findIndex((el) => el.moduleInstanceId === moduleInstanceId);

        if (moduleInstanceIndex !== -1) {
            page.layout.splice(moduleInstanceIndex, 1);
        }

        this._workbench.removeModuleInstance(moduleInstanceId);

        if (this._activeModuleInstanceId === moduleInstanceId) {
            this._activeModuleInstanceId = null;
            this.notifySubscribers(LayoutEvents.ActiveModuleInstanceChanged);
        }

        this.saveToLocalStorage();
        this.notifySubscribers(LayoutEvents.PageLayoutChanged);
    }

    makeAndAddModuleInstanceToActivePage(moduleName: string, layoutElement: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module '${moduleName}' not found`);
        }

        const page = this.findPageByUuid(this._activePageUuid || "");
        if (!page) {
            throw new Error(`Cannot add module instance to invalid page '${this._activePageUuid}'`);
        }

        module.setWorkbench(this._workbench);

        const moduleInstance = module.makeInstance();
        page.layout.push({ ...layoutElement, moduleInstanceId: moduleInstance.getId() });
        this.saveToLocalStorage();
        this._workbench.addModuleInstance(moduleInstance);

        this.notifySubscribers(LayoutEvents.PageLayoutChanged);

        return moduleInstance;
    }

    private notifySubscribers(event: LayoutEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: LayoutEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    getModuleInstancesForPage(pageUuid: string): ModuleInstance<any>[] {
        const page = this.findPageByUuid(pageUuid);
        if (!page) return [];

        const moduleInstances: ModuleInstance<any>[] = [];

        for (const layoutElement of page.layout) {
            const moduleInstance = this._workbench.getModuleInstance(layoutElement.moduleInstanceId || "");
            if (moduleInstance) {
                moduleInstances.push(moduleInstance);
            }
        }

        return moduleInstances;
    }
}

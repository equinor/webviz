import { GuiState } from "./GuiMessageBroker";
import { InitialSettings } from "./InitialSettings";
import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { Template } from "./TemplateRegistry";
import { Workbench } from "./Workbench";

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
};

export enum ModuleInstanceEvents {
    ModuleInstancesChanged = "ModuleInstancesChanged",
    FullModuleRerenderRequested = "FullModuleRerenderRequested",
}

export class ModuleInstanceManager {
    private _workbench: Workbench;
    private _moduleInstances: ModuleInstance<any>[];
    private _layout: LayoutElement[];
    private _perModuleRunningInstanceNumber: Record<string, number>;
    private _subscribersMap: { [key: string]: Set<() => void> };

    constructor(workbench: Workbench) {
        this._workbench = workbench;
        this._layout = [];
        this._moduleInstances = [];
        this._perModuleRunningInstanceNumber = {};
        this._subscribersMap = {};
    }

    loadLayoutFromLocalStorage(): boolean {
        const layoutString = localStorage.getItem("layout");
        if (!layoutString) return false;

        const layout = JSON.parse(layoutString) as LayoutElement[];
        this.makeLayout(layout);
        return true;
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    makeLayout(layout: LayoutElement[]): void {
        this._moduleInstances = [];
        this.setLayout(layout);
        layout.forEach((element, index: number) => {
            const module = ModuleRegistry.getModule(element.moduleName);
            if (!module) {
                throw new Error(`Module ${element.moduleName} not found`);
            }

            module.setWorkbench(this._workbench);
            const moduleInstance = module.makeInstance(this.getNextModuleInstanceNumber(module.getName()));
            this._moduleInstances.push(moduleInstance);
            this._layout[index] = { ...this._layout[index], moduleInstanceId: moduleInstance.getId() };
            this.notifySubscribers(ModuleInstanceEvents.ModuleInstancesChanged);
        });
    }

    clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            this._workbench.getBroadcaster().unregisterAllChannelsForModuleInstance(moduleInstance.getId());
        }
        this._moduleInstances = [];
        this._perModuleRunningInstanceNumber = {};
        this._layout = [];
        this.notifySubscribers(ModuleInstanceEvents.FullModuleRerenderRequested);
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
        this.notifySubscribers(ModuleInstanceEvents.FullModuleRerenderRequested);

        const modifiedLayout = layout.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });
        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
    }

    private notifySubscribers(event: ModuleInstanceEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: ModuleInstanceEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    getModuleInstances(): ModuleInstance<any>[] {
        return this._moduleInstances;
    }

    getModuleInstance(id: string): ModuleInstance<any> | undefined {
        return this._moduleInstances.find((moduleInstance) => moduleInstance.getId() === id);
    }

    private getNextModuleInstanceNumber(moduleName: string): number {
        if (moduleName in this._perModuleRunningInstanceNumber) {
            this._perModuleRunningInstanceNumber[moduleName] += 1;
        } else {
            this._perModuleRunningInstanceNumber[moduleName] = 1;
        }
        return this._perModuleRunningInstanceNumber[moduleName];
    }

    makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        module.setWorkbench(this._workbench);

        const moduleInstance = module.makeInstance(this.getNextModuleInstanceNumber(module.getName()));
        this._moduleInstances.push(moduleInstance);

        this._layout.push({ ...layout, moduleInstanceId: moduleInstance.getId() });
        this.notifySubscribers(ModuleInstanceEvents.ModuleInstancesChanged);
        this._workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, moduleInstance.getId());
        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        this._workbench.getBroadcaster().unregisterAllChannelsForModuleInstance(moduleInstanceId);
        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        const activeModuleInstanceId = this._workbench.getGuiMessageBroker().getState(GuiState.ActiveModuleInstanceId);
        if (activeModuleInstanceId === moduleInstanceId) {
            this._workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, "");
        }
        this.notifySubscribers(ModuleInstanceEvents.ModuleInstancesChanged);
    }

    maybeMakeFirstModuleInstanceActive(): void {
        const activeModuleInstanceId = this._workbench.getGuiMessageBroker().getState(GuiState.ActiveModuleInstanceId);
        if (!this._moduleInstances.some((el) => el.getId() === activeModuleInstanceId)) {
            const newActiveModuleInstanceId =
                this._moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this._workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, newActiveModuleInstanceId);
        }
    }

    applyTemplate(template: Template): void {
        this.clearLayout();

        const newLayout = template.moduleInstances.map((el) => {
            return { ...el.layout, moduleName: el.moduleName };
        });

        this.makeLayout(newLayout);

        for (let i = 0; i < this._moduleInstances.length; i++) {
            const moduleInstance = this._moduleInstances[i];
            const templateModule = template.moduleInstances[i];
            if (templateModule.syncedSettings) {
                for (const syncSettingKey of templateModule.syncedSettings) {
                    moduleInstance.addSyncedSetting(syncSettingKey);
                }
            }

            const initialSettings: Record<string, unknown> = templateModule.initialSettings || {};

            if (templateModule.dataChannelsToInitialSettingsMapping) {
                for (const propName of Object.keys(templateModule.dataChannelsToInitialSettingsMapping)) {
                    const dataChannel = templateModule.dataChannelsToInitialSettingsMapping[propName];

                    const moduleInstanceIndex = template.moduleInstances.findIndex(
                        (el) => el.instanceRef === dataChannel.listensToInstanceRef
                    );
                    if (moduleInstanceIndex === -1) {
                        throw new Error("Could not find module instance for data channel");
                    }

                    const listensToModuleInstance = this._moduleInstances[moduleInstanceIndex];
                    const channel = listensToModuleInstance.getContext().getChannel(dataChannel.channelName);
                    if (!channel) {
                        throw new Error("Could not find channel");
                    }

                    initialSettings[propName] = channel.getName();
                }
            }

            moduleInstance.setInitialSettings(new InitialSettings(initialSettings));

            if (i === 0) {
                this._workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, moduleInstance.getId());
            }
        }

        this.notifySubscribers(ModuleInstanceEvents.ModuleInstancesChanged);
    }
}

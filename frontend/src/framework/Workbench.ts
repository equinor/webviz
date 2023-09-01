import { QueryClient } from "@tanstack/react-query";

import { Broadcaster } from "./Broadcaster";
import { EnsembleIdent } from "./EnsembleIdent";
import { InitialSettings } from "./InitialSettings";
import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { StateStore } from "./StateStore";
import { Template } from "./TemplateRegistry";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { loadEnsembleSetMetadataFromBackend } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";

export enum WorkbenchEvents {
    ActiveModuleChanged = "ActiveModuleChanged",
    ModuleInstancesChanged = "ModuleInstancesChanged",
    FullModuleRerenderRequested = "FullModuleRerenderRequested",
}

export enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
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
    drawerContent: DrawerContent;
    settingsPanelWidthInPercent: number;
    loadingEnsembleSet: boolean;
};

export class Workbench {
    private _moduleInstances: ModuleInstance<any>[];
    private _activeModuleId: string;
    private _guiStateStore: StateStore<WorkbenchGuiState>;
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _broadcaster: Broadcaster;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private _layout: LayoutElement[];
    private _perModuleRunningInstanceNumber: Record<string, number>;

    constructor() {
        this._moduleInstances = [];
        this._activeModuleId = "";
        this._guiStateStore = new StateStore<WorkbenchGuiState>({
            drawerContent: DrawerContent.ModuleSettings,
            settingsPanelWidthInPercent: parseFloat(localStorage.getItem("settingsPanelWidthInPercent") || "20"),
            loadingEnsembleSet: false,
        });
        this._workbenchSession = new WorkbenchSessionPrivate();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
        this._broadcaster = new Broadcaster();
        this._subscribersMap = {};
        this._layout = [];
        this._perModuleRunningInstanceNumber = {};
    }

    loadLayoutFromLocalStorage(): boolean {
        const layoutString = localStorage.getItem("layout");
        if (!layoutString) return false;

        const layout = JSON.parse(layoutString) as LayoutElement[];
        this.makeLayout(layout);
        return true;
    }

    getGuiStateStore(): StateStore<WorkbenchGuiState> {
        return this._guiStateStore;
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._workbenchSettings;
    }

    getBroadcaster(): Broadcaster {
        return this._broadcaster;
    }

    getActiveModuleId(): string {
        return this._activeModuleId;
    }

    getActiveModuleName(): string {
        return (
            this._moduleInstances
                .find((moduleInstance) => moduleInstance.getId() === this._activeModuleId)
                ?.getTitle() || ""
        );
    }

    setActiveModuleId(id: string) {
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

    makeLayout(layout: LayoutElement[]): void {
        this._moduleInstances = [];
        this.setLayout(layout);
        layout.forEach((element, index: number) => {
            const module = ModuleRegistry.getModule(element.moduleName);
            if (!module) {
                throw new Error(`Module ${element.moduleName} not found`);
            }

            module.setWorkbench(this);
            const moduleInstance = module.makeInstance(this.getNextModuleInstanceNumber(module.getName()));
            this._moduleInstances.push(moduleInstance);
            this._layout[index] = { ...this._layout[index], moduleInstanceId: moduleInstance.getId() };
            this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        });
    }

    clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            this._broadcaster.unregisterAllChannelsForModuleInstance(moduleInstance.getId());
        }
        this._moduleInstances = [];
        this._perModuleRunningInstanceNumber = {};
        this._layout = [];
        this.notifySubscribers(WorkbenchEvents.FullModuleRerenderRequested);
    }

    makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        module.setWorkbench(this);

        const moduleInstance = module.makeInstance(this.getNextModuleInstanceNumber(module.getName()));
        this._moduleInstances.push(moduleInstance);

        this._layout.push({ ...layout, moduleInstanceId: moduleInstance.getId() });
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        this._activeModuleId = moduleInstance.getId();
        this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        this._broadcaster.unregisterAllChannelsForModuleInstance(moduleInstanceId);
        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        if (this._activeModuleId === moduleInstanceId) {
            this._activeModuleId = "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
        this.notifySubscribers(WorkbenchEvents.FullModuleRerenderRequested);

        const modifiedLayout = layout.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });
        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
    }

    maybeMakeFirstModuleInstanceActive(): void {
        if (!this._moduleInstances.some((el) => el.getId() === this._activeModuleId)) {
            this._activeModuleId =
                this._moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
    }

    async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        specifiedEnsembleIdents: EnsembleIdent[]
    ): Promise<void> {
        this.storeEnsembleSetInLocalStorage(specifiedEnsembleIdents);

        const ensembleIdentsToLoad: EnsembleIdent[] = [];
        for (const ensSpec of specifiedEnsembleIdents) {
            ensembleIdentsToLoad.push(new EnsembleIdent(ensSpec.getCaseUuid(), ensSpec.getEnsembleName()));
        }

        console.debug("loadAndSetupEnsembleSetInSession - starting load");
        const newEnsembleSet = await loadEnsembleSetMetadataFromBackend(queryClient, ensembleIdentsToLoad);
        console.debug("loadAndSetupEnsembleSetInSession - loading done");

        console.debug("loadAndSetupEnsembleSetInSession - publishing");
        return this._workbenchSession.setEnsembleSet(newEnsembleSet);
    }

    private storeEnsembleSetInLocalStorage(specifiedEnsembleIdents: EnsembleIdent[]): void {
        const ensembleIdentsToStore = specifiedEnsembleIdents.map((el) => el.toString());
        localStorage.setItem("ensembleIdents", JSON.stringify(ensembleIdentsToStore));
    }

    maybeLoadEnsembleSetFromLocalStorage(): EnsembleIdent[] | null {
        const ensembleIdentsString = localStorage.getItem("ensembleIdents");
        if (!ensembleIdentsString) return null;

        const ensembleIdents = JSON.parse(ensembleIdentsString) as string[];
        const ensembleIdentsParsed = ensembleIdents.map((el) => EnsembleIdent.fromString(el));

        return ensembleIdentsParsed;
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
                this._activeModuleId = moduleInstance.getId();
                this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
            }
        }

        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }
}

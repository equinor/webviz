import type { QueryClient } from "@tanstack/react-query";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker, GuiState } from "./GuiMessageBroker";
import { InitialSettings } from "./InitialSettings";
import { loadMetadataFromBackendAndCreateEnsembleSet } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";
import { ImportState } from "./Module";
import type { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { Template } from "./TemplateRegistry";
import type { WorkbenchServices } from "./WorkbenchServices";

export enum WorkbenchEvents {
    ModuleInstancesChanged = "ModuleInstancesChanged",
}

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
};

export type UserEnsembleSetting = {
    ensembleIdent: RegularEnsembleIdent;
    customName: string | null;
    color: string;
};

export type UserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: RegularEnsembleIdent;
    referenceEnsembleIdent: RegularEnsembleIdent;
    customName: string | null;
    color: string;
};

export type StoredUserEnsembleSetting = {
    ensembleIdent: string;
    customName: string | null;
    color: string;
};

export type StoredUserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
    customName: string | null;
    color: string;
};

export class Workbench {
    private _moduleInstances: ModuleInstance<any>[];
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _guiMessageBroker: GuiMessageBroker;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private _layout: LayoutElement[];
    private _perModuleRunningInstanceNumber: Record<string, number>;
    private _atomStoreMaster: AtomStoreMaster;

    constructor() {
        this._moduleInstances = [];
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchSession = new WorkbenchSessionPrivate(this._atomStoreMaster);
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
        this._guiMessageBroker = new GuiMessageBroker();
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

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    getAtomStoreMaster(): AtomStoreMaster {
        return this._atomStoreMaster;
    }

    getWorkbenchSession(): WorkbenchSessionPrivate {
        return this._workbenchSession;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._workbenchSettings;
    }

    getGuiMessageBroker(): GuiMessageBroker {
        return this._guiMessageBroker;
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
            this._atomStoreMaster.makeAtomStoreForModuleInstance(moduleInstance.getId());
            this._moduleInstances.push(moduleInstance);
            this._layout[index] = { ...this._layout[index], moduleInstanceId: moduleInstance.getId() };
            this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        });
    }

    resetModuleInstanceNumbers(): void {
        this._perModuleRunningInstanceNumber = {};
    }

    clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            const manager = moduleInstance.getChannelManager();
            manager.unregisterAllChannels();
            manager.unregisterAllReceivers();
        }
        this._moduleInstances = [];
        this._layout = [];
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        module.setWorkbench(this);

        const moduleInstance = module.makeInstance(this.getNextModuleInstanceNumber(module.getName()));
        this._atomStoreMaster.makeAtomStoreForModuleInstance(moduleInstance.getId());
        this._moduleInstances.push(moduleInstance);

        this._layout.push({ ...layout, moduleInstanceId: moduleInstance.getId() });
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        this.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, moduleInstance.getId());
        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        const moduleInstance = this.getModuleInstance(moduleInstanceId);

        if (moduleInstance) {
            const manager = moduleInstance.getChannelManager();

            moduleInstance.unload();
            manager.unregisterAllChannels();
            manager.unregisterAllReceivers();
        }

        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        this._atomStoreMaster.removeAtomStoreForModuleInstance(moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        const activeModuleInstanceId = this.getGuiMessageBroker().getState(GuiState.ActiveModuleInstanceId);
        if (activeModuleInstanceId === moduleInstanceId) {
            this.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, "");
        }
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;

        const modifiedLayout = layout.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });
        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
    }

    maybeMakeFirstModuleInstanceActive(): void {
        const activeModuleInstanceId = this.getGuiMessageBroker().getState(GuiState.ActiveModuleInstanceId);
        if (!this._moduleInstances.some((el) => el.getId() === activeModuleInstanceId)) {
            const newActiveModuleInstanceId =
                this._moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, newActiveModuleInstanceId);
        }
    }

    async initWorkbenchFromLocalStorage(queryClient: QueryClient): Promise<void> {
        const storedUserEnsembleSettings = this.maybeLoadEnsembleSettingsFromLocalStorage();
        const storedUserDeltaEnsembleSettings = this.maybeLoadDeltaEnsembleSettingsFromLocalStorage();

        if (!storedUserEnsembleSettings && !storedUserDeltaEnsembleSettings) {
            return;
        }

        await this.loadAndSetupEnsembleSetInSession(
            queryClient,
            storedUserEnsembleSettings ?? [],
            storedUserDeltaEnsembleSettings ?? [],
        );
    }

    async storeSettingsInLocalStorageAndLoadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        userEnsembleSettings: UserEnsembleSetting[],
        userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        this.storeEnsembleSetInLocalStorage(userEnsembleSettings);
        this.storeDeltaEnsembleSetInLocalStorage(userDeltaEnsembleSettings);

        await this.loadAndSetupEnsembleSetInSession(queryClient, userEnsembleSettings, userDeltaEnsembleSettings);
    }

    private async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        userEnsembleSettings: UserEnsembleSetting[],
        userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        console.debug("loadAndSetupEnsembleSetInSession - starting load");
        this._workbenchSession.setEnsembleSetLoadingState(true);
        const newEnsembleSet = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            userDeltaEnsembleSettings,
        );
        console.debug("loadAndSetupEnsembleSetInSession - loading done");
        console.debug("loadAndSetupEnsembleSetInSession - publishing");
        this._workbenchSession.setEnsembleSetLoadingState(false);
        this._workbenchSession.setEnsembleSet(newEnsembleSet);
    }

    private storeEnsembleSetInLocalStorage(ensembleSettingsToStore: UserEnsembleSetting[]): void {
        const ensembleSettingsArrayToStore: StoredUserEnsembleSetting[] = ensembleSettingsToStore.map((el) => ({
            ...el,
            ensembleIdent: el.ensembleIdent.toString(),
        }));
        localStorage.setItem("userEnsembleSettings", JSON.stringify(ensembleSettingsArrayToStore));
    }

    private storeDeltaEnsembleSetInLocalStorage(deltaEnsembleSettingsToStore: UserDeltaEnsembleSetting[]): void {
        const deltaEnsembleSettingsArrayToStore: StoredUserDeltaEnsembleSetting[] = deltaEnsembleSettingsToStore.map(
            (el) => ({
                ...el,
                comparisonEnsembleIdent: el.comparisonEnsembleIdent.toString(),
                referenceEnsembleIdent: el.referenceEnsembleIdent.toString(),
            }),
        );
        localStorage.setItem("userDeltaEnsembleSettings", JSON.stringify(deltaEnsembleSettingsArrayToStore));
    }

    maybeLoadEnsembleSettingsFromLocalStorage(): UserEnsembleSetting[] | null {
        const ensembleSettingsString = localStorage.getItem("userEnsembleSettings");
        if (!ensembleSettingsString) return null;

        const ensembleSettingsArray = JSON.parse(ensembleSettingsString) as StoredUserEnsembleSetting[];
        const parsedEnsembleSettingsArray: UserEnsembleSetting[] = ensembleSettingsArray.map((el) => ({
            ...el,
            ensembleIdent: RegularEnsembleIdent.fromString(el.ensembleIdent),
        }));

        return parsedEnsembleSettingsArray;
    }

    maybeLoadDeltaEnsembleSettingsFromLocalStorage(): UserDeltaEnsembleSetting[] | null {
        const deltaEnsembleSettingsString = localStorage.getItem("userDeltaEnsembleSettings");
        if (!deltaEnsembleSettingsString) return null;

        const deltaEnsembleSettingsArray = JSON.parse(deltaEnsembleSettingsString) as StoredUserDeltaEnsembleSetting[];
        const parsedDeltaEnsembleSettingsArray: UserDeltaEnsembleSetting[] = deltaEnsembleSettingsArray.map((el) => ({
            ...el,
            comparisonEnsembleIdent: RegularEnsembleIdent.fromString(el.comparisonEnsembleIdent),
            referenceEnsembleIdent: RegularEnsembleIdent.fromString(el.referenceEnsembleIdent),
        }));

        return parsedDeltaEnsembleSettingsArray;
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
                        (el) => el.instanceRef === dataChannel.listensToInstanceRef,
                    );
                    if (moduleInstanceIndex === -1) {
                        throw new Error("Could not find module instance for data channel");
                    }

                    const listensToModuleInstance = this._moduleInstances[moduleInstanceIndex];
                    const channel = listensToModuleInstance.getChannelManager().getChannel(dataChannel.channelIdString);
                    if (!channel) {
                        throw new Error("Could not find channel");
                    }

                    const receiver = moduleInstance.getChannelManager().getReceiver(propName);

                    if (!receiver) {
                        throw new Error("Could not find receiver");
                    }

                    receiver.subscribeToChannel(channel, "All");
                }
            }

            moduleInstance.setInitialSettings(new InitialSettings(initialSettings));

            if (i === 0) {
                this.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, moduleInstance.getId());
            }
        }

        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }
}

import type { QueryClient } from "@tanstack/react-query";

import type { EnsembleTimestamps_api } from "@api";
import { getEnsembleTimestampsOptions } from "@api";

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
import type { RegularEnsemble } from "./RegularEnsemble";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { Template } from "./TemplateRegistry";
import { isEnsembleOutdated } from "./utils/ensembleTimestampUtils";
import type { WorkbenchServices } from "./WorkbenchServices";

export enum WorkbenchEvents {
    LayoutChanged = "LayoutChanged",
    ModuleInstancesChanged = "ModuleInstancesChanged",
}

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

export type UserEnsembleSetting = {
    ensembleIdent: RegularEnsembleIdent;
    customName: string | null;
    color: string;
    timestamps: EnsembleTimestamps_api | null;
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
    timestamps: EnsembleTimestamps_api | null;
};

export type StoredUserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
    customName: string | null;
    color: string;
};

function ensembleToUserSettings(ensemble: RegularEnsemble): UserEnsembleSetting {
    return {
        color: ensemble.getColor(),
        customName: ensemble.getCustomName(),
        ensembleIdent: ensemble.getIdent(),
        timestamps: ensemble.getTimestamps(),
    };
}

const ENSEMBLE_POLLING_INTERVAL = 60000; // 1 minute

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
            this.notifySubscribers(WorkbenchEvents.LayoutChanged);
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
        this.notifySubscribers(WorkbenchEvents.LayoutChanged);
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
        this.notifySubscribers(WorkbenchEvents.LayoutChanged);
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
        this.notifySubscribers(WorkbenchEvents.LayoutChanged);
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

        this.beginEnsembleUpdatePolling(queryClient);
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

    private _pollingEnabled = false;
    private _pollingInProgress = false;
    private _waitingPollingRun?: NodeJS.Timeout;

    beginEnsembleUpdatePolling(queryClient: QueryClient) {
        // A polling is actively in progress, don't start a new one
        if (this._pollingInProgress) return;
        // If the next polling attempt is already waiting, cancel the timeout, and run this new one immediately instead
        clearTimeout(this._waitingPollingRun);

        // Start polling
        console.debug("checkForEnsembleUpdate - initializing...");
        this._pollingEnabled = true;
        this._queueEnsemblePolling(queryClient);
    }

    stopEnsembleUpdatePolling() {
        clearTimeout(this._waitingPollingRun);
        this._pollingEnabled = false;
    }

    private _queueEnsemblePolling(queryClient: QueryClient) {
        if (!this._pollingEnabled) return;

        this._waitingPollingRun = setTimeout(async () => {
            if (!this._pollingEnabled) return;

            await this._recursivelyPollForEnsembleChange(queryClient);
        }, ENSEMBLE_POLLING_INTERVAL);
    }

    private async _recursivelyPollForEnsembleChange(queryClient: QueryClient) {
        console.debug("checkForEnsembleUpdate - fetching...");
        this._pollingInProgress = true;

        const regularEnsembleSet = this._workbenchSession.getEnsembleSet().getRegularEnsembleArray();

        const latestTimeStampPromises = regularEnsembleSet.map(async (ens) => {
            return [ens, await this._getLatestEnsembleTimestamp(queryClient, ens)] as const;
        });
        const latestTimestamps = await Promise.all(latestTimeStampPromises);

        const newSettings = latestTimestamps.reduce((acc, [ens, ts]) => {
            if (!isEnsembleOutdated(ens, ts)) return acc;

            return acc.concat({
                ...ensembleToUserSettings(ens),
                // ? Should we store both, or just the latest one?
                timestamps: ts,
            });
        }, [] as UserEnsembleSetting[]);

        if (newSettings.length) {
            this._updateExistingUserEnsembleSettings(queryClient, newSettings);
        }

        console.debug("checkForEnsembleUpdate - done...");
        console.debug("checkForEnsembleUpdate - queueing next...");

        this._pollingInProgress = false;

        this._queueEnsemblePolling(queryClient);
    }

    private async _getLatestEnsembleTimestamp(queryClient: QueryClient, ensemble: RegularEnsemble) {
        return await queryClient.fetchQuery({
            ...getEnsembleTimestampsOptions({
                path: { case_uuid: ensemble.getCaseUuid(), ensemble_name: ensemble.getEnsembleName() },
            }),
            staleTime: 0,
            gcTime: 0,
        });
    }

    private async _updateExistingUserEnsembleSettings(queryClient: QueryClient, newSettings: UserEnsembleSetting[]) {
        if (newSettings.length === 0) return;

        const existingEnsembleSettings = this.maybeLoadEnsembleSettingsFromLocalStorage() ?? [];
        const existingDeltaEnsembleSettings = this.maybeLoadDeltaEnsembleSettingsFromLocalStorage() ?? [];

        const newEnsembleSettings = existingEnsembleSettings.map((el) => {
            const newSetting = newSettings.find((newEl) => newEl.ensembleIdent.equals(el.ensembleIdent));
            if (newSetting) return newSetting;
            return el;
        });

        await this.storeSettingsInLocalStorageAndLoadAndSetupEnsembleSetInSession(
            queryClient,
            newEnsembleSettings, existingDeltaEnsembleSettings
        )
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

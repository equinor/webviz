import type { QueryClient } from "@tanstack/react-query";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker } from "./GuiMessageBroker";
import { loadMetadataFromBackendAndCreateEnsembleSet } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { WorkbenchServices } from "./WorkbenchServices";

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
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;

    constructor(queryClient: QueryClient) {
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchSession = new WorkbenchSessionPrivate(this._atomStoreMaster, queryClient);
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
        this._guiMessageBroker = new GuiMessageBroker();
    }

    initialize(): void {
        this._workbenchSession.makeDefaultDashboard();
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

    clear(): void {
        this._workbenchSession.clear();
    }

    /*
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
        */
}

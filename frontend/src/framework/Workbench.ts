import type { QueryClient } from "@tanstack/react-query";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker } from "./GuiMessageBroker";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSession } from "./internal/PrivateWorkbenchSession";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
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
    private _workbenchSession: PrivateWorkbenchSession;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;

    constructor(queryClient: QueryClient) {
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchSession = new PrivateWorkbenchSession(this._atomStoreMaster, queryClient);
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
        this._guiMessageBroker = new GuiMessageBroker();
    }

    async initialize() {
        await this._workbenchSession.initFromLocalStorage();
    }

    getAtomStoreMaster(): AtomStoreMaster {
        return this._atomStoreMaster;
    }

    getWorkbenchSession(): PrivateWorkbenchSession {
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

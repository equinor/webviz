import { QueryClient } from "@tanstack/react-query";

import { Broadcaster } from "./Broadcaster";
import { EnsembleIdent } from "./EnsembleIdent";
import { GuiMessageBroker } from "./GuiMessageBroker";
import { LayoutService } from "./LayoutService";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { loadEnsembleSetMetadataFromBackend } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";

export class Workbench {
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _broadcaster: Broadcaster;
    private _guiMessageBroker: GuiMessageBroker;
    private _layout: LayoutService;

    constructor() {
        this._workbenchSession = new WorkbenchSessionPrivate();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
        this._broadcaster = new Broadcaster();
        this._guiMessageBroker = new GuiMessageBroker();
        this._layout = new LayoutService(this);
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

    getGuiMessageBroker(): GuiMessageBroker {
        return this._guiMessageBroker;
    }

    getLayoutService(): LayoutService {
        return this._layout;
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
}

import React from "react";

import { DrawerContent, LayoutElement, Workbench } from "@framework/Workbench";
import { NavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { useQueryClient } from "@tanstack/react-query";

import { useSetStoreValue } from "./framework/StateStore";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const layout: LayoutElement[] = [];

const getFullWebsocketUrl = (rootPath: string) => {
    // Need a utility while waiting on https://github.com/whatwg/websockets/pull/45
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}${rootPath}`
}

const ws = new WebSocket(getFullWebsocketUrl("/user-session-log"));

ws.onmessage = function(event) {
    console.log(JSON.parse(event.data))
};

function App() {
    const workbench = React.useRef<Workbench>(new Workbench());
    const queryClient = useQueryClient();

    const setLoadingEnsembleSet = useSetStoreValue(workbench.current.getGuiStateStore(), "loadingEnsembleSet");

    React.useEffect(() => {
        if (!workbench.current.loadLayoutFromLocalStorage()) {
            workbench.current.makeLayout(layout);
        }

        if (workbench.current.getLayout().length === 0) {
            workbench.current.getGuiStateStore().setValue("drawerContent", DrawerContent.ModulesList);
        }

        const storedEnsembleIdents = workbench.current.maybeLoadEnsembleSetFromLocalStorage();
        if (storedEnsembleIdents) {
            workbench.current.getGuiStateStore().setValue("loadingEnsembleSet", true);
            workbench.current.loadAndSetupEnsembleSetInSession(queryClient, storedEnsembleIdents).then(() => {
                setLoadingEnsembleSet(false);
            });
        }

        return function () {
            workbench.current.clearLayout();
        };
    }, []);

    return (
        <div className="h-screen flex flex-row">
            <NavBar workbench={workbench.current} />
            <SettingsContentPanels workbench={workbench.current} />
        </div>
    );
}

export default App;

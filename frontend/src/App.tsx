import React from "react";

import { DrawerContent, LayoutElement, Workbench } from "@framework/Workbench";
import { LoginDialog } from "@framework/internal/components/LoginDialog";
import { NavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { useQueryClient } from "@tanstack/react-query";

import { useSetStoreValue } from "./framework/StateStore";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const layout: LayoutElement[] = [];

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
        <>
            <LoginDialog />
            <div className="h-screen flex flex-row">
                <NavBar workbench={workbench.current} />
                <SettingsContentPanels workbench={workbench.current} />
            </div>
        </>
    );
}

export default App;

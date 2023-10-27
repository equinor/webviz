import React from "react";

import { DrawerContent, GuiState } from "@framework/GuiMessageBroker";
import { LayoutElement, Workbench } from "@framework/Workbench";
import { NavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { useQueryClient } from "@tanstack/react-query";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const layout: LayoutElement[] = [];

function App() {
    const workbench = React.useRef<Workbench>(new Workbench());
    const queryClient = useQueryClient();

    React.useEffect(function handleMount() {
        if (!workbench.current.loadLayoutFromLocalStorage()) {
            workbench.current.makeLayout(layout);
        }

        if (workbench.current.getLayout().length === 0) {
            workbench.current.getGuiMessageBroker().setState(GuiState.DrawerContent, DrawerContent.ModulesList);
        }

        const storedEnsembleIdents = workbench.current.maybeLoadEnsembleSetFromLocalStorage();
        if (storedEnsembleIdents) {
            workbench.current.loadAndSetupEnsembleSetInSession(queryClient, storedEnsembleIdents);
        }

        return function handleUnmount() {
            workbench.current.clearLayout();
            workbench.current.resetModuleInstanceNumbers();
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

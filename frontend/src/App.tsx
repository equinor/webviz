import React from "react";

import { DrawerContent, GuiState } from "@framework/GuiMessageBroker";
import { LayoutElement } from "@framework/ModuleInstanceManager";
import { Workbench } from "@framework/Workbench";
import { NavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { useQueryClient } from "@tanstack/react-query";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const layout: LayoutElement[] = [];

function App() {
    const workbench = React.useRef<Workbench>(new Workbench());
    const queryClient = useQueryClient();

    React.useEffect(() => {
        if (!workbench.current.getModuleInstanceManager().loadLayoutFromLocalStorage()) {
            workbench.current.getModuleInstanceManager().makeLayout(layout);
        }

        if (workbench.current.getModuleInstanceManager().getLayout().length === 0) {
            workbench.current.getGuiMessageBroker().setState(GuiState.DrawerContent, DrawerContent.ModulesList);
        }

        const storedEnsembleIdents = workbench.current.maybeLoadEnsembleSetFromLocalStorage();
        if (storedEnsembleIdents) {
            workbench.current.getGuiMessageBroker().setState(GuiState.LoadingEnsembleSet, true);
            workbench.current.loadAndSetupEnsembleSetInSession(queryClient, storedEnsembleIdents).then(() => {
                workbench.current.getGuiMessageBroker().setState(GuiState.LoadingEnsembleSet, false);
            });
        }

        return function () {
            workbench.current.getModuleInstanceManager().clearLayout();
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

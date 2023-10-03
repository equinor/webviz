import React from "react";

import { DrawerContent, GuiState, useSetGuiValue } from "@framework/GuiMessageBroker";
import { LayoutElement } from "@framework/LayoutService";
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

    const setLoadingEnsembleSet = useSetGuiValue(workbench.current.getGuiMessageBroker(), GuiState.LoadingEnsembleSet);

    React.useEffect(() => {
        if (!workbench.current.getLayoutService().loadLayoutFromLocalStorage()) {
            workbench.current.getLayoutService().makeLayout(layout);
        }

        if (workbench.current.getLayoutService().getLayout().length === 0) {
            workbench.current.getGuiMessageBroker().setState(GuiState.DrawerContent, DrawerContent.ModulesList);
        }

        const storedEnsembleIdents = workbench.current.maybeLoadEnsembleSetFromLocalStorage();
        if (storedEnsembleIdents) {
            workbench.current.getGuiMessageBroker().setState(GuiState.LoadingEnsembleSet, true);
            workbench.current.loadAndSetupEnsembleSetInSession(queryClient, storedEnsembleIdents).then(() => {
                setLoadingEnsembleSet(false);
            });
        }

        return function () {
            workbench.current.getLayoutService().clearLayout();
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

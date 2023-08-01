import React from "react";

import { LayoutElement, Workbench } from "@framework/Workbench";
import { NavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const layout: LayoutElement[] = [];

function App() {
    const workbench = new Workbench();

    React.useEffect(() => {
        if (!workbench.loadLayoutFromLocalStorage()) {
            workbench.makeLayout(layout);
        }
    }, []);

    return (
        <AuthProvider>
            <CustomQueryClientProvider>
                <div className="h-screen flex flex-row">
                    <NavBar workbench={workbench} />
                    <SettingsContentPanels workbench={workbench} />
                </div>
            </CustomQueryClientProvider>
        </AuthProvider>
    );
}

export default App;

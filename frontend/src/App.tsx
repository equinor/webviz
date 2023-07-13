import React from "react";

import { LayoutElement, Workbench } from "@framework/Workbench";
import { Content } from "@framework/internal/components/Content";
import { ModulesList } from "@framework/internal/components/Content/private-components/modulesList";
import { GroupModules } from "@framework/internal/components/Content/private-components/syncSettings";
import { TemplatesList } from "@framework/internal/components/Content/private-components/templatesList";
import { NavBar } from "@framework/internal/components/NavBar";
import { Settings } from "@framework/internal/components/Settings";
import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";
import { ResizablePanels } from "@lib/components/ResizablePanels";

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
                    <ResizablePanels
                        id="settings-content"
                        direction="horizontal"
                        minSizes={[300, 0]}
                        initialSizesPercent={[25, 75]}
                    >
                        <Settings workbench={workbench} />
                        <div className="flex flex-col flex-grow h-full">
                            <Content workbench={workbench} />
                        </div>
                    </ResizablePanels>
                </div>
            </CustomQueryClientProvider>
        </AuthProvider>
    );
}

export default App;

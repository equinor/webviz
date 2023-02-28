import React from "react";

import { LayoutElement, Workbench } from "@framework/Workbench";
import { Content } from "@framework/components/Content";
import { Settings } from "@framework/components/Settings";
import { TopNavBar } from "@framework/components/TopNavBar";
import { AuthProvider } from "@framework/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/providers/QueryClientProvider";

import "./modules/registerAllModules.ts";

//const layout: LayoutElement[] = [];
const layout: LayoutElement[] = [{ moduleName: "SigSurfaceModule", relX: 0, relY: 0, relHeight: 1, relWidth: 1 }];

function App() {
    const workbench = new Workbench();

    React.useEffect(() => {
        workbench.makeLayout(layout);
        // if (!workbench.loadLayoutFromLocalStorage()) {
        //     workbench.makeLayout(layout);
        // }
    }, []);

    return (
        <AuthProvider>
            <CustomQueryClientProvider>
                <div className="h-screen flex flex-row">
                    <Settings workbench={workbench} />
                    <div className="flex flex-col flex-grow">
                        <TopNavBar workbench={workbench} />
                        <Content workbench={workbench} />
                    </div>
                </div>
            </CustomQueryClientProvider>
        </AuthProvider>
    );
}

export default App;

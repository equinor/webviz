import React from "react";

import { LayoutElement, Workbench } from "@framework/Workbench";
import { Content } from "@framework/components/Content";
import { Settings } from "@framework/components/Settings";
import { TopNavBar } from "@framework/components/TopNavBar";
import { CustomQueryClientProvider } from "@framework/providers/QueryClientProvider";

import "./modules/registerAllModules.ts";

const layout: LayoutElement[] = [
    {
        moduleName: "MyModule",
        position: 1,
        width: 50,
        height: 50,
    },
    {
        moduleName: "MyModule2",
        position: 2,
        width: 50,
        height: 50,
    },
    {
        moduleName: "MyModule",
        position: 1,
        width: 100,
        height: 50,
    },
];

function App() {
    const workbench = new Workbench();

    React.useEffect(() => {
        workbench.makeLayout(layout);
    }, []);

    return (
        <CustomQueryClientProvider>
            <div className="h-screen flex flex-row">
                <Settings workbench={workbench} />
                <div className="flex flex-col flex-grow">
                    <TopNavBar workbench={workbench} />
                    <Content workbench={workbench} />
                </div>
            </div>
        </CustomQueryClientProvider>
    );
}

export default App;

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
        width: 0.25,
        height: 0.5,
        x: 0,
        y: 0,
    },
    {
        moduleName: "MyModule2",
        width: 0.25,
        height: 0.5,
        x: 0.25,
        y: 0,
    },
    {
        moduleName: "MyModule2",
        width: 0.25,
        height: 0.5,
        x: 0.5,
        y: 0,
    },
    {
        moduleName: "MyModule2",
        width: 0.25,
        height: 0.5,
        x: 0.75,
        y: 0,
    },
    {
        moduleName: "MyModule",
        width: 1,
        height: 0.5,
        x: 0,
        y: 0.5,
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

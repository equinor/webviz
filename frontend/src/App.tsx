import React from "react";

import { Content } from "@/core/components/Content";
import { Settings } from "@/core/components/Settings";
import { TopNavBar } from "@/core/components/TopNavBar";
import { Workbench } from "@/core/framework/Workbench";
import { ApiServiceWrapper } from "@/core/providers/ApiServiceProvider";
import { CustomQueryClientProvider } from "@/core/providers/QueryClientProvider";

import "./modules/index.ts";

function App() {
    const workbench = new Workbench();

    React.useEffect(() => {
        workbench.makeLayout(["MyModule", "MyModule2", "MyModule"]);
    }, []);

    return (
        <CustomQueryClientProvider>
            <ApiServiceWrapper>
                <div className="h-screen flex flex-row">
                    <Settings workbench={workbench} />
                    <div className="flex flex-col flex-grow">
                        <TopNavBar workbench={workbench} />
                        <Content workbench={workbench} />
                    </div>
                </div>
            </ApiServiceWrapper>
        </CustomQueryClientProvider>
    );
}

export default App;

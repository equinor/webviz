import React from "react";

import { ModuleContext } from "@/core/framework/module";
import { workbench } from "@/core/framework/workbench";

workbench.makeLayout(["MyModule"]);

export const Content: React.FC = () => {
    React.useEffect(() => {}, [workbench.getModuleInstances()]);
    return (
        <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8">
            {workbench.getModuleInstances().map((module) => {
                if (module.loading) return <div>Loading...</div>;
                const context: ModuleContext = {
                    useModuleState: module.stateStore.useModuleState,
                    useModuleStateValue: module.stateStore.useModuleStateValue,
                    useSetModuleStateValue:
                        module.stateStore.setModuleStateValue,
                };
                return (
                    <div key={module.id}>
                        <h1>{module.name}</h1>
                        <module.View moduleContext={context} />
                    </div>
                );
            })}
        </div>
    );
};

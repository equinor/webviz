import React from "react";

import { ModuleContext } from "@/core/framework/module";
import { WorkbenchContext, workbench } from "@/core/framework/workbench";
import { useWorkbenchActiveModuleId } from "@/core/hooks/useWorkbenchActiveModuleId";
import { useWorkbenchModuleInstances } from "@/core/hooks/useWorkbenchModules";

workbench.makeLayout(["MyModule", "MyModule2", "MyModule"]);

const workbenchContext: WorkbenchContext = {
    useWorkbenchStateValue: workbench.getStateStore().useStateValue(),
};

export const Content: React.FC = () => {
    const moduleInstances = useWorkbenchModuleInstances();
    const activeModuleId = useWorkbenchActiveModuleId();

    return (
        <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8">
            {moduleInstances.map((module) => {
                if (module.loading)
                    return <div key={module.id}>Loading...</div>;
                const moduleContext: ModuleContext = {
                    useModuleState: module.stateStore.useState(),
                    useModuleStateValue: module.stateStore.useStateValue(),
                    useSetModuleStateValue: module.stateStore.setStateValue,
                };
                return (
                    <div
                        key={module.id}
                        className={`bg-white p-4 ${
                            activeModuleId === module.id ? "border-red-600" : ""
                        } m-4 border-solid border`}
                        onClick={() => (workbench.activeModuleId = module.id)}
                    >
                        <h1>{module.name}</h1>
                        <module.View
                            moduleContext={moduleContext}
                            workbenchContext={workbenchContext}
                        />
                    </div>
                );
            })}
        </div>
    );
};

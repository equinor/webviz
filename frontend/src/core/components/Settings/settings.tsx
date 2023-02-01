import React from "react";

import { ModuleContext } from "@/core/framework/module";
import { WorkbenchContext, workbench } from "@/core/framework/workbench";
import { useWorkbenchActiveModuleId } from "@/core/hooks/useWorkbenchActiveModuleId";
import { useWorkbenchModuleInstances } from "@/core/hooks/useWorkbenchModules";

const workbenchContext: WorkbenchContext = {
    useWorkbenchStateValue: workbench.getStateStore().useStateValue(),
};

export const Settings: React.FC = () => {
    const moduleInstances = useWorkbenchModuleInstances();
    const activeModuleId = useWorkbenchActiveModuleId();

    return (
        <div className="bg-white p-4 w-72">
            {moduleInstances.map((module) => {
                if (module.loading) return null;
                const moduleContext: ModuleContext = {
                    useModuleState: module.stateStore.useState(),
                    useModuleStateValue: module.stateStore.useStateValue(),
                    useSetModuleStateValue: module.stateStore.setStateValue,
                };
                return (
                    <div
                        key={module.id}
                        style={{
                            display:
                                activeModuleId === module.id ? "block" : "none",
                        }}
                    >
                        <module.Settings
                            moduleContext={moduleContext}
                            workbenchContext={workbenchContext}
                        />
                    </div>
                );
            })}
        </div>
    );
};

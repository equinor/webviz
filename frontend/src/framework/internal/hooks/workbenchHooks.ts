import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench, WorkbenchEvents } from "@framework/Workbench";

export function useModuleInstances(workbench: Workbench): ModuleInstance<any, any, any, any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any, any, any, any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(workbench.getModuleInstances());
        }

        const unsubscribeFunc = workbench.subscribe(
            WorkbenchEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, [workbench]);

    return moduleInstances;
}

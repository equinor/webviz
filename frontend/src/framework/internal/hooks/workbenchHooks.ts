import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench, WorkbenchEvents } from "@framework/Workbench";

export function useActiveModuleId(workbench: Workbench): string {
    const [activeModuleId, setActiveModuleId] = React.useState<string>("");

    React.useEffect(() => {
        function handleActiveModuleChange() {
            setActiveModuleId(workbench.getActiveModuleId());
        }

        const unsubscribeFunc = workbench.subscribe(WorkbenchEvents.ActiveModuleChanged, handleActiveModuleChange);

        return unsubscribeFunc;
    }, []);

    return activeModuleId;
}

export function useModuleInstances(workbench: Workbench): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(workbench.getModuleInstances());
        }

        const unsubscribeFunc = workbench.subscribe(
            WorkbenchEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, []);

    return moduleInstances;
}

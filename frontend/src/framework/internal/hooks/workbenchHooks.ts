import React from "react";

import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench} from "@framework/Workbench";
import { WorkbenchEvents } from "@framework/Workbench";

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
    }, [workbench]);

    return moduleInstances;
}

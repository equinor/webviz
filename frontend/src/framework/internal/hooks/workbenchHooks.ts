import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleInstanceEvents, ModuleInstanceManager } from "@framework/ModuleInstanceManager";

export function useModuleInstances(moduleInstanceManager: ModuleInstanceManager): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(moduleInstanceManager.getModuleInstances());
        }

        const unsubscribeFunc = moduleInstanceManager.subscribe(
            ModuleInstanceEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, []);

    return moduleInstances;
}

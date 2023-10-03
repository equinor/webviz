import React from "react";

import { ModuleInstanceEvents, ModuleInstanceManager } from "@framework/LayoutService";
import { ModuleInstance } from "@framework/ModuleInstance";

export function useModuleInstances(layoutService: ModuleInstanceManager): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(layoutService.getModuleInstances());
        }

        const unsubscribeFunc = layoutService.subscribe(
            ModuleInstanceEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, []);

    return moduleInstances;
}

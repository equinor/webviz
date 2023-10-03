import React from "react";

import { LayoutEvents, LayoutService } from "@framework/LayoutService";
import { ModuleInstance } from "@framework/ModuleInstance";

export function useModuleInstances(layoutService: LayoutService): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(layoutService.getModuleInstances());
        }

        const unsubscribeFunc = layoutService.subscribe(
            LayoutEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, []);

    return moduleInstances;
}

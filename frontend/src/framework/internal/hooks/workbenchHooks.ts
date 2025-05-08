import React from "react";

import type { ModuleInstance } from "@framework/ModuleInstance";
import type { LayoutElement, Workbench } from "@framework/Workbench";
import { WorkbenchEvents } from "@framework/Workbench";

export function useModuleInstances(workbench: Workbench): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(workbench.getModuleInstances());
        }

        const unsubscribeFunc = workbench.subscribe(
            WorkbenchEvents.ModuleInstancesChanged,
            handleModuleInstancesChange,
        );

        return unsubscribeFunc;
    }, [workbench]);

    return moduleInstances;
}

export function useModuleLayout(workbench: Workbench): LayoutElement[] {
    // ? Shouldn't these hooks use React.syncExternalStore?
    const [layout, setLayout] = React.useState<LayoutElement[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setLayout(workbench.getLayout());
        }

        const unsubscribeFunc = workbench.subscribe(WorkbenchEvents.LayoutChanged, handleModuleInstancesChange);

        return unsubscribeFunc;
    }, [workbench]);

    return layout;
}

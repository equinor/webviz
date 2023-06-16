import React from "react";

import { LayoutEvents } from "@framework/Layout";

import { ModuleInstance } from "../ModuleInstance";
import { Workbench, WorkbenchEvents } from "../Workbench";

export function useActiveModuleInstanceId(workbench: Workbench): string | null {
    const [activeModuleInstanceId, setActiveModuleInstanceId] = React.useState<string | null>(null);

    React.useEffect(() => {
        function handleActiveModuleInstanceChange() {
            setActiveModuleInstanceId(workbench.getLayout().getActiveModuleInstanceId());
        }

        const unsubscribeFunc = workbench
            .getLayout()
            .subscribe(LayoutEvents.ActiveModuleInstanceChanged, handleActiveModuleInstanceChange);

        return unsubscribeFunc;
    }, []);

    return activeModuleInstanceId;
}

export function useModuleInstances(workbench: Workbench): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>(workbench.getModuleInstances());

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

export function useActivePageUuid(workbench: Workbench): string | null {
    const [activePageUuid, setActivePageUuid] = React.useState<string | null>(
        workbench.getLayout().getActivePageUuid()
    );

    React.useEffect(() => {
        function handleActivePageUuidChange() {
            setActivePageUuid(workbench.getLayout().getActivePageUuid());
        }

        const unsubscribeFunc = workbench
            .getLayout()
            .subscribe(LayoutEvents.ActivePageChanged, handleActivePageUuidChange);

        return unsubscribeFunc;
    }, []);

    return activePageUuid;
}

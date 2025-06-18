import React from "react";

import { DashboardTopic, type Dashboard, type LayoutElement } from "@framework/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";

export function useModuleInstances(dashboard: Dashboard): ModuleInstance<any, any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any, any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(dashboard.getModuleInstances());
        }

        const unsubscribeFunc = dashboard.subscribe(DashboardTopic.ModuleInstances, handleModuleInstancesChange);

        return unsubscribeFunc;
    }, [dashboard]);

    return moduleInstances;
}

export function useModuleLayout(dashboard: Dashboard): LayoutElement[] {
    // ? Shouldn't these hooks use React.syncExternalStore?
    const [layout, setLayout] = React.useState<LayoutElement[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setLayout(dashboard.getLayout());
        }

        const unsubscribeFunc = dashboard.subscribe(DashboardTopic.Layout, handleModuleInstancesChange);

        return unsubscribeFunc;
    }, [dashboard]);

    return layout;
}

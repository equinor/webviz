import React from "react";

import { Workbench, WorkbenchEvents } from "../framework/Workbench";

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

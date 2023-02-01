import { workbench } from "..";

import React from "react";

import { ModuleInstance } from "../framework/module";

export const useWorkbenchModuleInstances = (): ModuleInstance[] => {
    const [moduleInstances, setModuleInstances] = React.useState<
        ModuleInstance[]
    >([]);

    React.useEffect(() => {
        const handleModuleAdded = () => {
            setModuleInstances(workbench.getModuleInstances());
        };

        window.addEventListener("workbench:modules-changed", handleModuleAdded);

        return () => {
            window.removeEventListener(
                "workbench:modules-changed",
                handleModuleAdded
            );
        };
    }, [workbench.getModuleInstances()]);

    return moduleInstances;
};

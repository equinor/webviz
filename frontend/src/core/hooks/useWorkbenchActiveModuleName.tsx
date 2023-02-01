import { workbench } from "..";

import React from "react";

export const useWorkbenchActiveModuleName = (): string => {
    const [activeModuleName, setActiveModuleName] = React.useState<string>("");

    React.useEffect(() => {
        const handleModuleSelected = () => {
            setActiveModuleName(workbench.activeModuleName);
        };

        window.addEventListener(
            "workbench:module-selected",
            handleModuleSelected
        );

        return () => {
            window.removeEventListener(
                "workbench:module-selected",
                handleModuleSelected
            );
        };
    }, []);

    return activeModuleName;
};

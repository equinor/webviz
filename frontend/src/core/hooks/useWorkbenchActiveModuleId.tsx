import { workbench } from "..";

import React from "react";

export const useWorkbenchActiveModuleId = (): string => {
    const [activeModuleId, setActiveModuleId] = React.useState<string>("");

    React.useEffect(() => {
        const handleModuleSelected = () => {
            setActiveModuleId(workbench.activeModuleId);
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

    return activeModuleId;
};

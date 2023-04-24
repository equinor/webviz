import React from "react";

import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

/*
    @rmt: This component does probably need virtualization and therefore refactoring. 
    As this includes a lot more implementation, 
    I will skip it for now and come back to it when it becomes a problem.
*/
export const GroupModules: React.FC<ModulesListProps> = (props) => {
    const visible = useStoreValue(props.workbench.getGuiStateStore(), "groupModulesOpen");

    return (
        <div className={`flex flex-col bg-white p-4 w-96 min-h-0 h-full${visible ? "" : " hidden"}`}>
            <div className="mt-4 flex-grow min-h-0 overflow-y-auto max-h-full h-0">Attributes</div>
        </div>
    );
};

import React from "react";

import { Workbench, WorkbenchEvents } from "@/core/framework/Workbench";

// import { useWorkbenchActiveModuleId } from "@/core/hooks/useWorkbenchActiveModuleId";
import { ViewWrapper } from "./private-components/viewWrapper";
import { useActiveModuleId } from "@/core/hooks/workbenchHooks";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleId = useActiveModuleId(props.workbench);

    /*
    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(props.workbench.getModuleInstances());
        }

        const unsubscribeFunc = props.workbench.subscribe(WorkbenchEvents.FullModuleRerenderRequested, handleModuleInstancesChange);

        return unsubscribeFunc;
    }, []);
    */

    return (
        <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8">
            {props.workbench.getModuleInstances().map((instance) => (
                <ViewWrapper
                    key={instance.getId()}
                    moduleInstance={instance}
                    workbench={props.workbench}
                    isActive={props.workbench.getActiveModuleId() === instance.getId()}
                />
            ))}
        </div>
    );
};

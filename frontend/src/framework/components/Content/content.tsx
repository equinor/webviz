import React from "react";

import { Workbench, WorkbenchEvents } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/hooks/workbenchHooks";

import { ViewWrapper } from "./private-components/viewWrapper";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleId = useActiveModuleId(props.workbench);
    const moduleInstances = useModuleInstances(props.workbench);

    return (
        <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8">
            {moduleInstances.map((instance) => (
                <ViewWrapper
                    key={instance.getId()}
                    moduleInstance={instance}
                    workbench={props.workbench}
                    isActive={activeModuleId === instance.getId()}
                />
            ))}
        </div>
    );
};

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
    const layout = props.workbench.getLayout();

    return (
        <div className="bg-slate-200 p-4 flex-grow border-spacing-x-8 box-border">
            {layout.map((element) => {
                const instance = moduleInstances.find((i) => i.getId() === element.moduleInstanceId);
                if (!instance) {
                    return null;
                }

                return (
                    <ViewWrapper
                        key={instance.getId()}
                        moduleInstance={instance}
                        workbench={props.workbench}
                        isActive={activeModuleId === instance.getId()}
                        width={`calc(${element.width}% - 1rem)`}
                        height={`calc(${element.height}% - 1rem)`}
                    />
                );
            })}
        </div>
    );
};

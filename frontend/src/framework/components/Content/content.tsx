import React from "react";

import { Workbench } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/hooks/workbenchHooks";

import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleId = useActiveModuleId(props.workbench);
    const moduleInstances = useModuleInstances(props.workbench);

    return (
        <div className="bg-slate-200 flex-grow p-1">
            <Layout workbench={props.workbench} activeModuleId={activeModuleId} moduleInstances={moduleInstances} />
        </div>
    );
};

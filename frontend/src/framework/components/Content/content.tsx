import React from "react";

import { Workbench } from "@framework/Workbench";
import { useActiveModuleInstanceId } from "@framework/hooks/workbenchHooks";

import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleId = useActiveModuleInstanceId(props.workbench);
    return (
        <div className="bg-slate-200 flex-grow">
            <Layout workbench={props.workbench} activeModuleId={activeModuleId} />
        </div>
    );
};

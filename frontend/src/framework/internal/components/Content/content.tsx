import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";

import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);
    return (
        <div className="bg-slate-600 flex-grow">
            <Layout workbench={props.workbench} activeModuleInstanceId={activeModuleInstanceId} />
        </div>
    );
};

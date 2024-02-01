import React from "react";

import { Workbench } from "@framework/Workbench";

import { RealizationFilterSettings } from "../RealizationFilterSettings";

type SidePanelProps = { workbench: Workbench };

export const SidePanel: React.FC<SidePanelProps> = (props) => {
    return (
        <div className="bg-white border-r-2 z-50 flex flex-col min-w-96 w-1/5">
            <RealizationFilterSettings workbench={props.workbench} />
        </div>
    );
};

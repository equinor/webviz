import React from "react";

import type { Workbench } from "@framework/Workbench";

import { DashboardStack } from "./private-components/dashboardStack";
import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";

type ContentProps = {
    workbench: Workbench;
};

export const Content = React.memo(function Content(props: ContentProps) {
    return (
        <>
            <DataChannelVisualizationLayer workbench={props.workbench} />
            <div className="relative grow">
                <DashboardStack workbench={props.workbench} />
            </div>
        </>
    );
});

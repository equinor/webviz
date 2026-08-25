import React from "react";

import type { Workbench } from "@framework/Workbench";

import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";
import { HotDashboardViews } from "./private-components/hotDashboardViews";
import { Layout } from "./private-components/layout";
import { ModuleViewContentHost } from "./private-components/moduleViewContentHost";

type ContentProps = {
    workbench: Workbench;
};

export const Content = React.memo(function Content(props: ContentProps) {
    return (
        <>
            <DataChannelVisualizationLayer workbench={props.workbench} />
            <div className="grow">
                <Layout workbench={props.workbench} />
            </div>
            <HotDashboardViews workbench={props.workbench} />
            <ModuleViewContentHost workbench={props.workbench} />
        </>
    );
});

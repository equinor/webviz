import React from "react";

import type { Workbench } from "@framework/Workbench";

import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";
import { Layout } from "./private-components/layout";

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
        </>
    );
});

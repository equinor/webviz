import type React from "react";

import type { Workbench } from "@framework/Workbench";

import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";
import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    return (
        <>
            <DataChannelVisualizationLayer workbench={props.workbench} />
            <div className="bg-gray-300 grow">
                <Layout workbench={props.workbench} />
            </div>
        </>
    );
};

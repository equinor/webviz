import type React from "react";

import { Layout } from "@framework/internal/components/Layout";
import type { Workbench } from "@framework/Workbench";

import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";

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

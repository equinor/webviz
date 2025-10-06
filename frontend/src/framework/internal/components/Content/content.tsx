import type React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { HoverTopic, useHoverValue, type HoverService } from "@framework/HoverService";
import type { Workbench } from "@framework/Workbench";

import { DataChannelVisualizationLayer } from "./private-components/DataChannelVisualizationLayer";
import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);
    return (
        <>
            <DataChannelVisualizationLayer workbench={props.workbench} />
            <div className="bg-slate-600 grow">
                <Layout workbench={props.workbench} activeModuleInstanceId={activeModuleInstanceId} />
            </div>
            <HoverReadout hoverService={props.workbench.getHoverService()} />
        </>
    );
};

function HoverReadout(props: { hoverService: HoverService }) {
    const hoveredMd = useHoverValue(HoverTopic.WELLBORE_MD, props.hoverService, "");
    const hoveredWellbore = useHoverValue(HoverTopic.WELLBORE, props.hoverService, "");

    return (
        <div className="fixed bottom-0 right-0 bg-white p-6 rounded z-[9999]">
            <p>MD: {hoveredMd?.md} </p>
            <p>Wellbore: {hoveredWellbore} </p>
        </div>
    );
}

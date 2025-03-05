import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { LeftSettingsPanel } from "../LeftSettingsPanel";
import { RightSettingsPanel } from "../RightSettingsPanel";

export type SettingsContentPanelsProps = {
    workbench: Workbench;
};

export const SettingsContentPanels: React.FC<SettingsContentPanelsProps> = (props) => {
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent,
    );
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelWidthInPercent,
    );

    const handleResizablePanelsChange = React.useCallback(
        function handleResizablePanelsChange(sizes: number[]) {
            setLeftSettingsPanelWidth(sizes[0]);
            setRightSettingsPanelWidth(sizes[2]);
        },
        [setLeftSettingsPanelWidth, setRightSettingsPanelWidth],
    );

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={[
                leftSettingsPanelWidth,
                100 - leftSettingsPanelWidth - rightSettingsPanelWidth,
                rightSettingsPanelWidth,
            ]}
            minSizes={[300, 0, 400]}
            onSizesChange={handleResizablePanelsChange}
        >
            <LeftSettingsPanel workbench={props.workbench} />
            <div className="flex flex-col grow h-full">
                <Content workbench={props.workbench} />
            </div>
            <RightSettingsPanel workbench={props.workbench} />
        </ResizablePanels>
    );
};

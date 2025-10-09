import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
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

    const rightDrawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);

    const handleResizablePanelsChange = React.useCallback(
        function handleResizablePanelsChange(sizes: number[]) {
            setLeftSettingsPanelWidth(sizes[0]);
            if (sizes.length === 3) {
                setRightSettingsPanelWidth(sizes[2]);
            }
        },
        [setLeftSettingsPanelWidth, setRightSettingsPanelWidth],
    );

    let sizes: number[];
    let minSizes: number[] = [300, 0];
    const panels: React.ReactNode[] = [
        <LeftSettingsPanel key="left-panel" workbench={props.workbench} />,
        <div key="content-panel" className="flex flex-col grow h-full">
            <Content workbench={props.workbench} />
        </div>,
    ];

    if (rightDrawerContent) {
        sizes = [
            leftSettingsPanelWidth,
            100 - leftSettingsPanelWidth - rightSettingsPanelWidth,
            rightSettingsPanelWidth,
        ];
        minSizes = [...minSizes, 400];
        panels.push(<RightSettingsPanel key="right-panel" workbench={props.workbench} />);
    } else {
        sizes = [leftSettingsPanelWidth, 100 - leftSettingsPanelWidth];
    }

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={sizes}
            minSizes={minSizes}
            onSizesChange={handleResizablePanelsChange}
        >
            {panels}
        </ResizablePanels>
    );
};

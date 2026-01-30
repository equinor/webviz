import React from "react";

import { GuiState, useGuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { LeftSettingsPanel } from "../LeftSettingsPanel";
import { RightSettingsPanel } from "../RightSettingsPanel";

const COLLAPSED_LEFT_PANEL_WIDTH_PX = 50;

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

    const setLeftSettingsPanelIsCollapsed = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelIsCollapsed,
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

    const handleCollapsedPanelsChange = React.useCallback(
        function handleCollapsedPanelsChange(collapsedStates: boolean[]) {
            setLeftSettingsPanelIsCollapsed(collapsedStates[0]);
        },
        [setLeftSettingsPanelIsCollapsed],
    );

    const minSizes = React.useMemo(
        function createRefStableMinSizes() {
            return rightDrawerContent ? [300, 0, 400] : [300, 0];
        },
        [rightDrawerContent],
    );
    const collapsedSizes = React.useMemo(
        function createRefStableCollapsedSizes() {
            return rightDrawerContent ? [COLLAPSED_LEFT_PANEL_WIDTH_PX, 0, 0] : [COLLAPSED_LEFT_PANEL_WIDTH_PX, 0];
        },
        [rightDrawerContent],
    );

    let sizes = [leftSettingsPanelWidth, 100 - leftSettingsPanelWidth];
    const panels: React.ReactNode[] = [
        <LeftSettingsPanel key="left-panel" workbench={props.workbench} />,
        <div key="content-panel" className="flex flex-col grow h-full">
            <Content workbench={props.workbench} />
        </div>,
    ];

    // If right drawer content is set, add the right settings panel
    if (rightDrawerContent) {
        sizes = [
            leftSettingsPanelWidth,
            100 - leftSettingsPanelWidth - rightSettingsPanelWidth,
            rightSettingsPanelWidth,
        ];
        panels.push(<RightSettingsPanel key="right-panel" workbench={props.workbench} />);
    }

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={sizes}
            minSizes={minSizes}
            collapsedSizes={collapsedSizes}
            onSizesChange={handleResizablePanelsChange}
            onCollapsedChange={handleCollapsedPanelsChange}
        >
            {panels}
        </ResizablePanels>
    );
};

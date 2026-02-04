import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { LeftSettingsPanel } from "../LeftSettingsPanel";
import { RightSettingsPanel } from "../RightSettingsPanel";

const LEFT_PANEL_COLLAPSED_WIDTH_PX = 50;
const LEFT_PANEL_MIN_WIDTH_PX = 300;
const RIGHT_PANEL_MIN_WIDTH_PX = 400;

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
    const [leftSettingsPanelIsCollapsed, setLeftSettingsPanelIsCollapsed] = useGuiState(
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
            return rightDrawerContent
                ? [LEFT_PANEL_MIN_WIDTH_PX, 0, RIGHT_PANEL_MIN_WIDTH_PX]
                : [LEFT_PANEL_MIN_WIDTH_PX, 0];
        },
        [rightDrawerContent],
    );
    const collapsedSizes = React.useMemo(
        function createRefStableCollapsedSizes() {
            return rightDrawerContent ? [LEFT_PANEL_COLLAPSED_WIDTH_PX, 0, 0] : [LEFT_PANEL_COLLAPSED_WIDTH_PX, 0];
        },
        [rightDrawerContent],
    );
    const collapsedStates = React.useMemo(
        function createRefStableCollapsedStates() {
            return rightDrawerContent
                ? [leftSettingsPanelIsCollapsed, null, null]
                : [leftSettingsPanelIsCollapsed, null];
        },
        [leftSettingsPanelIsCollapsed, rightDrawerContent],
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
            collapsedStates={collapsedStates}
            collapsedSizes={collapsedSizes}
            onSizesChange={handleResizablePanelsChange}
            onCollapsedChange={handleCollapsedPanelsChange}
        >
            {panels}
        </ResizablePanels>
    );
};

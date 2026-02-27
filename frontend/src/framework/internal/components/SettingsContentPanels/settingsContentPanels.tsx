import React from "react";

import {
    ResizableSettingsPanels,
    type ResizablePanels,
    type SettingsPanelsCollapsedState,
    type SettingsPanelsWidth,
} from "@framework/components/ResizableSettingsPanels";
import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";

import { Content } from "../Content";
import { LeftSettingsPanel } from "../LeftSettingsPanel";
import { RightSettingsPanel } from "../RightSettingsPanel";

// Constants to control panel widths in GuiState
export const SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT = 5;
export const SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT = 15;

// Constants for the ResizableSettingsPanels component
const LEFT_SETTINGS_PANEL_COLLAPSED_WIDTH_PX = 50;
const LEFT_SETTINGS_PANEL_MIN_WIDTH_PX = 300;
const RIGHT_SETTINGS_PANEL_MIN_WIDTH_PX = 400;

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
    const [rightSettingsPanelIsCollapsed, setRightSettingsPanelIsCollapsed] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelIsCollapsed,
    );

    const rightDrawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);

    const handleResizablePanelsChange = React.useCallback(
        function handleResizablePanelsChange(widths: SettingsPanelsWidth) {
            if (widths.leftSettingsPanel !== undefined) {
                setLeftSettingsPanelWidth(widths.leftSettingsPanel);
            }
            if (widths.rightSettingsPanel !== undefined) {
                setRightSettingsPanelWidth(widths.rightSettingsPanel);
            }
        },
        [setLeftSettingsPanelWidth, setRightSettingsPanelWidth],
    );

    const handleCollapsedPanelsChange = React.useCallback(
        function handleCollapsedPanelsChange(states: SettingsPanelsCollapsedState) {
            if (states.leftSettingsPanel !== undefined && states.leftSettingsPanel !== null) {
                setLeftSettingsPanelIsCollapsed(states.leftSettingsPanel);
            }
            if (states.rightSettingsPanel != null && states.rightSettingsPanel !== null) {
                setRightSettingsPanelIsCollapsed(states.rightSettingsPanel);
            }
        },
        [setLeftSettingsPanelIsCollapsed, setRightSettingsPanelIsCollapsed],
    );

    const minWidthsPx = React.useMemo<SettingsPanelsWidth>(() => {
        if (rightDrawerContent) {
            return {
                leftSettingsPanel: LEFT_SETTINGS_PANEL_MIN_WIDTH_PX,
                rightSettingsPanel: RIGHT_SETTINGS_PANEL_MIN_WIDTH_PX,
            };
        }
        return { leftSettingsPanel: LEFT_SETTINGS_PANEL_MIN_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedWidthsPx = React.useMemo<SettingsPanelsWidth>(() => {
        if (rightDrawerContent) {
            return { leftSettingsPanel: LEFT_SETTINGS_PANEL_COLLAPSED_WIDTH_PX, rightSettingsPanel: 0 };
        }
        return { leftSettingsPanel: LEFT_SETTINGS_PANEL_COLLAPSED_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedStates = React.useMemo<SettingsPanelsCollapsedState>(() => {
        if (rightDrawerContent) {
            return {
                leftSettingsPanel: leftSettingsPanelIsCollapsed,
                rightSettingsPanel: rightSettingsPanelIsCollapsed,
            };
        }
        return { leftSettingsPanel: leftSettingsPanelIsCollapsed };
    }, [leftSettingsPanelIsCollapsed, rightSettingsPanelIsCollapsed, rightDrawerContent]);

    const widthsPercent = React.useMemo<SettingsPanelsWidth>(() => {
        if (rightDrawerContent) {
            return { leftSettingsPanel: leftSettingsPanelWidth, rightSettingsPanel: rightSettingsPanelWidth };
        }
        return { leftSettingsPanel: leftSettingsPanelWidth };
    }, [leftSettingsPanelWidth, rightSettingsPanelWidth, rightDrawerContent]);

    const panels: ResizablePanels = {
        leftSettingsPanel: <LeftSettingsPanel workbench={props.workbench} />,
        content: (
            <div className="flex flex-col grow h-full">
                <Content workbench={props.workbench} />
            </div>
        ),
        rightSettingsPanel: rightDrawerContent ? <RightSettingsPanel workbench={props.workbench} /> : undefined,
    };

    return (
        <ResizableSettingsPanels
            widthsPercent={widthsPercent}
            minWidthsPx={minWidthsPx}
            collapsedStates={collapsedStates}
            collapsedWidthsPx={collapsedWidthsPx}
            onWidthsChange={handleResizablePanelsChange}
            onCollapsedChange={handleCollapsedPanelsChange}
        >
            {panels}
        </ResizableSettingsPanels>
    );
};

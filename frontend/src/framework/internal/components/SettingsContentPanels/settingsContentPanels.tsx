import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import {
    ResizableSettingsPanels,
    type ResizablePanels,
    type SettingsPanelsCollapsedState,
    type SettingsPanelsWidth,
} from "@lib/components/ResizableSettingsPanels";

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
        },
        [setLeftSettingsPanelIsCollapsed],
    );

    const minWidths = React.useMemo<SettingsPanelsWidth>(() => {
        if (rightDrawerContent) {
            return { leftSettingsPanel: LEFT_PANEL_MIN_WIDTH_PX, rightSettingsPanel: RIGHT_PANEL_MIN_WIDTH_PX };
        }
        return { leftSettingsPanel: LEFT_PANEL_MIN_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedWidths = React.useMemo<SettingsPanelsWidth>(() => {
        if (rightDrawerContent) {
            return { leftSettingsPanel: LEFT_PANEL_COLLAPSED_WIDTH_PX, rightSettingsPanel: 0 };
        }
        return { leftSettingsPanel: LEFT_PANEL_COLLAPSED_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedStates = React.useMemo<SettingsPanelsCollapsedState>(() => {
        if (rightDrawerContent) {
            return { leftSettingsPanel: leftSettingsPanelIsCollapsed, rightSettingsPanel: null };
        }
        return { leftSettingsPanel: leftSettingsPanelIsCollapsed };
    }, [leftSettingsPanelIsCollapsed, rightDrawerContent]);

    const widthsInPercent = React.useMemo<SettingsPanelsWidth>(() => {
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
            widthsInPercent={widthsInPercent}
            minWidths={minWidths}
            collapsedStates={collapsedStates}
            collapsedWidths={collapsedWidths}
            onWidthsChange={handleResizablePanelsChange}
            onCollapsedChange={handleCollapsedPanelsChange}
        >
            {panels}
        </ResizableSettingsPanels>
    );
};

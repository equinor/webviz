import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import {
    ResizableSettingsPanels,
    type ResizablePanels,
    type SettingsPanelCollapsedStates,
    type SettingsPanelSizes,
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
        function handleResizablePanelsChange(sizes: SettingsPanelSizes) {
            if (sizes.leftSettings !== undefined) {
                setLeftSettingsPanelWidth(sizes.leftSettings);
            }
            if (sizes.rightSettings !== undefined) {
                setRightSettingsPanelWidth(sizes.rightSettings);
            }
        },
        [setLeftSettingsPanelWidth, setRightSettingsPanelWidth],
    );

    const handleCollapsedPanelsChange = React.useCallback(
        function handleCollapsedPanelsChange(states: SettingsPanelCollapsedStates) {
            if (states.leftSettings !== undefined && states.leftSettings !== null) {
                setLeftSettingsPanelIsCollapsed(states.leftSettings);
            }
        },
        [setLeftSettingsPanelIsCollapsed],
    );

    const minSizes = React.useMemo<SettingsPanelSizes>(() => {
        if (rightDrawerContent) {
            return { leftSettings: LEFT_PANEL_MIN_WIDTH_PX, rightSettings: RIGHT_PANEL_MIN_WIDTH_PX };
        }
        return { leftSettings: LEFT_PANEL_MIN_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedSizes = React.useMemo<SettingsPanelSizes>(() => {
        if (rightDrawerContent) {
            return { leftSettings: LEFT_PANEL_COLLAPSED_WIDTH_PX, rightSettings: 0 };
        }
        return { leftSettings: LEFT_PANEL_COLLAPSED_WIDTH_PX };
    }, [rightDrawerContent]);

    const collapsedStates = React.useMemo<SettingsPanelCollapsedStates>(() => {
        if (rightDrawerContent) {
            return { leftSettings: leftSettingsPanelIsCollapsed, rightSettings: null };
        }
        return { leftSettings: leftSettingsPanelIsCollapsed };
    }, [leftSettingsPanelIsCollapsed, rightDrawerContent]);

    const sizesInPercent = React.useMemo<SettingsPanelSizes>(() => {
        if (rightDrawerContent) {
            return { leftSettings: leftSettingsPanelWidth, rightSettings: rightSettingsPanelWidth };
        }
        return { leftSettings: leftSettingsPanelWidth };
    }, [leftSettingsPanelWidth, rightSettingsPanelWidth, rightDrawerContent]);

    const panels: ResizablePanels = {
        leftSettings: <LeftSettingsPanel workbench={props.workbench} />,
        content: (
            <div className="flex flex-col grow h-full">
                <Content workbench={props.workbench} />
            </div>
        ),
        rightSettings: rightDrawerContent ? <RightSettingsPanel workbench={props.workbench} /> : undefined,
    };

    return (
        <ResizableSettingsPanels
            id="settings-content"
            sizesInPercent={sizesInPercent}
            minSizes={minSizes}
            collapsedStates={collapsedStates}
            collapsedSizes={collapsedSizes}
            onSizesChange={handleResizablePanelsChange}
            onCollapsedChange={handleCollapsedPanelsChange}
        >
            {panels}
        </ResizableSettingsPanels>
    );
};

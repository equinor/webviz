import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { FilterPanel } from "../FilterPanel";
import { Settings } from "../Settings/settings";

export type SettingsContentPanelsProps = {
    workbench: Workbench;
};

export const SettingsContentPanels: React.FC<SettingsContentPanelsProps> = (props) => {
    const [settingsPanelWidth, setSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SettingsPanelWidthInPercent
    );
    const [filterPanelWidth, setFilterPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.FilterPanelWidthInPercent
    );
    const [filterPanelExpanded, setFilterPanelExpanded] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.FilterPanelExpanded
    );

    const handleResizablePanelsChange = React.useCallback(
        function handleResizablePanelsChange(sizes: number[]) {
            setSettingsPanelWidth(sizes[0]);
            setFilterPanelWidth(sizes[2]);
            setFilterPanelExpanded(sizes[2] > 0);
        },
        [setSettingsPanelWidth, setFilterPanelWidth, setFilterPanelExpanded]
    );

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={[settingsPanelWidth, 100 - settingsPanelWidth - filterPanelWidth, filterPanelWidth]}
            minSizes={[300, 0, 300]}
            onSizesChange={handleResizablePanelsChange}
            visible={[settingsPanelWidth > 0, true, filterPanelExpanded]}
        >
            <Settings workbench={props.workbench} />
            <div className="flex flex-col flex-grow h-full">
                <Content workbench={props.workbench} />
            </div>
            <FilterPanel workbench={props.workbench} />
        </ResizablePanels>
    );
};

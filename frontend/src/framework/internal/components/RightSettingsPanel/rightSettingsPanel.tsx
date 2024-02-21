import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";

import { RealizationFilterSettings } from "../RealizationFilterSettings";

type RightSettingsPanelProps = { workbench: Workbench };

export const RightSettingsPanel: React.FC<RightSettingsPanelProps> = (props) => {
    const [, setRightSettingsPanelExpanded] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelExpanded
    );
    const [, setRightSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelWidthInPercent
    );

    function handleRealizationFilterSettingsOnClose() {
        setRightSettingsPanelExpanded(false);
        setRightSettingsPanelWidth(0);
    }

    return (
        <div className="bg-white border-r-2 z-50 flex flex-col w-full h-full">
            <RealizationFilterSettings workbench={props.workbench} onClose={handleRealizationFilterSettingsOnClose} />
        </div>
    );
};

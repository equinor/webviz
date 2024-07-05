import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";

import { ModuleInstanceLog } from "./private-components/ModuleInstanceLog/moduleInstanceLog";
import { RealizationFilterSettings } from "./private-components/RealizationFilterSettings";

type RightSettingsPanelProps = { workbench: Workbench };

export const RightSettingsPanel: React.FC<RightSettingsPanelProps> = (props) => {
    const [, setRightSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelWidthInPercent
    );

    function handleRealizationFilterSettingsClose() {
        setRightSettingsPanelWidth(0);
    }

    function handleModuleInstanceLogClose() {
        setRightSettingsPanelWidth(0);
    }

    return (
        <div className="bg-white border-r-2 z-50 flex flex-col w-full h-full">
            <RealizationFilterSettings workbench={props.workbench} onClose={handleRealizationFilterSettingsClose} />
            <ModuleInstanceLog workbench={props.workbench} onClose={handleModuleInstanceLogClose} />
        </div>
    );
};

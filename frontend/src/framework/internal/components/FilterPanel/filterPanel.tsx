import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";

import { RealizationFilterSettings } from "../RealizationFilterSettings";

type FilterPanelProps = { workbench: Workbench };

export const FilterPanel: React.FC<FilterPanelProps> = (props) => {
    const [, setFilterPanelExpanded] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.FilterPanelExpanded);
    const [, setFilterPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.FilterPanelWidthInPercent
    );

    function handleRealizationFilterSettingsOnClose() {
        setFilterPanelExpanded(false);
        setFilterPanelWidth(0);
    }

    return (
        <div className="bg-white border-r-2 z-50 flex flex-col w-full">
            <RealizationFilterSettings workbench={props.workbench} onClose={handleRealizationFilterSettingsOnClose} />
        </div>
    );
};

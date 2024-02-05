import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FilterAlt } from "@mui/icons-material";

type RightNavBarProps = {
    workbench: Workbench;
};

export const RightNavBar: React.FC<RightNavBarProps> = (props) => {
    const [filterPanelWidth, setFilterPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.FilterPanelWidthInPercent
    );
    const [filterPanelExpanded, setFilterPanelExpanded] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.FilterPanelExpanded
    );

    function ensureFilterPanelIsVisible() {
        if (filterPanelWidth <= 5) {
            setFilterPanelWidth(15);
        }
    }

    function handleFilterPanelCollapseOrExpand() {
        const newExpanded = !filterPanelExpanded;

        localStorage.setItem("filterPanelExpanded", newExpanded.toString());
        setFilterPanelExpanded(newExpanded);
        if (newExpanded) {
            ensureFilterPanelIsVisible();
            return;
        }
        setFilterPanelWidth(0);
    }

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-[4.5rem]"
            )}
        >
            <div className="flex flex-col gap-2 flex-grow">
                <Button
                    title="Open Filter Panel"
                    onClick={handleFilterPanelCollapseOrExpand}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        filterPanelExpanded ? "text-cyan-600" : "!text-slate-800"
                    )}
                    startIcon={<FilterAlt fontSize="small" className="w-5 h-5 mr-2" />}
                />
            </div>
        </div>
    );
};

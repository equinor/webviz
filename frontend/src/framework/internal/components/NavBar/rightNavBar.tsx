import React from "react";

import { GuiState, RightDrawerContent, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FilterAlt, History } from "@mui/icons-material";

type RightNavBarProps = {
    workbench: Workbench;
};

export const RightNavBar: React.FC<RightNavBarProps> = (props) => {
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightDrawerContent
    );

    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelWidthInPercent
    );

    function ensureSettingsPanelIsVisible() {
        if (rightSettingsPanelWidth <= 5) {
            setRightSettingsPanelWidth(15);
        }
    }

    function handleRealizationFilterClick() {
        if (rightSettingsPanelWidth > 0 && drawerContent === RightDrawerContent.RealizationFilterSettings) {
            setRightSettingsPanelWidth(0);
            return;
        }
        ensureSettingsPanelIsVisible();
        setDrawerContent(RightDrawerContent.RealizationFilterSettings);
    }

    function handleModuleInstanceLogClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-[4.5rem]"
            )}
        >
            <div className="flex flex-col gap-2 flex-grow">
                <Button
                    title="Open realization filter panel"
                    onClick={handleRealizationFilterClick}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === RightDrawerContent.RealizationFilterSettings && rightSettingsPanelWidth > 0
                            ? "text-cyan-600"
                            : "!text-slate-800"
                    )}
                    startIcon={<FilterAlt fontSize="small" className="w-5 h-5 mr-2" />}
                />
                <Button
                    title="Open realization filter panel"
                    onClick={handleModuleInstanceLogClick}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === RightDrawerContent.ModuleInstanceLog && rightSettingsPanelWidth > 0
                            ? "text-cyan-600"
                            : "!text-slate-800"
                    )}
                    startIcon={<History fontSize="small" className="w-5 h-5 mr-2" />}
                />
            </div>
        </div>
    );
};

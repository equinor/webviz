import React from "react";

import { GuiEvent, GuiState, RightDrawerContent, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FilterAlt, History } from "@mui/icons-material";

type RightNavBarProps = {
    workbench: Workbench;
};

export const RightNavBar: React.FC<RightNavBarProps> = (props) => {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [drawerContent, setDrawerContent] = useGuiState(guiMessageBroker, GuiState.RightDrawerContent);
    const [numberOfUnsavedRealizationFilters] = useGuiState(
        guiMessageBroker,
        GuiState.NumberOfUnsavedRealizationFilters
    );
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent
    );

    function ensureSettingsPanelIsVisible() {
        if (rightSettingsPanelWidth <= 5) {
            setRightSettingsPanelWidth(15);
        }
    }

    function handleRealizationFilterClick() {
        ensureSettingsPanelIsVisible();
        handleSetDrawerContent(RightDrawerContent.RealizationFilterSettings);
    }

    function handleModuleInstanceLogClick() {
        ensureSettingsPanelIsVisible();
        handleSetDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    function handleSetDrawerContent(content: RightDrawerContent) {
        if (content !== RightDrawerContent.RealizationFilterSettings) {
            guiMessageBroker.publishEvent(GuiEvent.RealizationFilterSettingsNotVisible);
        }

        setDrawerContent(content);
    }

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-[4.5rem]"
            )}
        >
            <div className="flex flex-col gap-2 flex-grow">
                <Button
                    title={`Open realization filter panel${
                        numberOfUnsavedRealizationFilters === 0 ? "" : " (unsaved changes)"
                    }`}
                    onClick={handleRealizationFilterClick}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === RightDrawerContent.RealizationFilterSettings && rightSettingsPanelWidth > 0
                            ? "text-blue-600"
                            : "!text-slate-800"
                    )}
                >
                    {numberOfUnsavedRealizationFilters !== 0 ? (
                        <Badge badgeContent="!" color="bg-blue-400">
                            <FilterAlt fontSize="small" className="w-5 h-5 mr-2" />
                        </Badge>
                    ) : (
                        <FilterAlt fontSize="small" className="w-5 h-5 mr-2" />
                    )}
                </Button>
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
                >
                    <History fontSize="small" className="w-5 h-5 mr-2" />
                </Button>
            </div>
        </div>
    );
};

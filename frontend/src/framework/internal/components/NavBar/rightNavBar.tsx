import type React from "react";

import { FilterAlt, Fullscreen, FullscreenExit, History } from "@mui/icons-material";

import { GuiState, RightDrawerContent, useGuiState } from "@framework/GuiMessageBroker";
import { useBrowserFullscreen } from "@framework/internal/hooks/useBrowserFullscreen";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type RightNavBarProps = {
    workbench: Workbench;
};

export const RightNavBar: React.FC<RightNavBarProps> = (props) => {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [isFullscreen, toggleFullScreen] = useBrowserFullscreen();
    const [drawerContent, setDrawerContent] = useGuiState(guiMessageBroker, GuiState.RightDrawerContent);
    const [numberOfUnsavedRealizationFilters] = useGuiState(
        guiMessageBroker,
        GuiState.NumberOfUnsavedRealizationFilters,
    );
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );

    function ensureSettingsPanelIsVisible() {
        if (rightSettingsPanelWidth <= 5) {
            setRightSettingsPanelWidth(30);
        }
    }

    function hideSettingsPanel() {
        setRightSettingsPanelWidth(0);
        setDrawerContent(undefined);
    }

    function togglePanelContent(targetContent: RightDrawerContent) {
        if (targetContent === drawerContent) hideSettingsPanel();
        else {
            setDrawerContent(targetContent);
            ensureSettingsPanelIsVisible();
        }
    }

    function handleRealizationFilterClick() {
        togglePanelContent(RightDrawerContent.RealizationFilterSettings);
    }

    function handleModuleInstanceLogClick() {
        togglePanelContent(RightDrawerContent.ModuleInstanceLog);
    }

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-[4.5rem]",
            )}
        >
            <div className="flex flex-col gap-2 grow">
                <NavBarButton
                    active={drawerContent === RightDrawerContent.RealizationFilterSettings}
                    title={`Open realization filter panel${
                        numberOfUnsavedRealizationFilters === 0 ? "" : " (unsaved changes)"
                    }`}
                    icon={
                        <Badge
                            badgeContent="!"
                            color="bg-orange-500"
                            invisible={numberOfUnsavedRealizationFilters === 0}
                        >
                            <FilterAlt fontSize="small" className="size-5 mr-2" />
                        </Badge>
                    }
                    onClick={handleRealizationFilterClick}
                />

                <NavBarButton
                    icon={<History fontSize="small" className="size-5 mr-2" />}
                    active={drawerContent === RightDrawerContent.ModuleInstanceLog}
                    title="Open module history"
                    onClick={handleModuleInstanceLogClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={isFullscreen}
                    icon={<Fullscreen fontSize="small" className="size-5 mr-2" />}
                    activeIcon={<FullscreenExit fontSize="small" className="size-5 mr-2" />}
                    title="Open module history"
                    onClick={toggleFullScreen}
                />
            </div>
        </div>
    );
};

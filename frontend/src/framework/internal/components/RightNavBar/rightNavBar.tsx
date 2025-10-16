import type React from "react";

import { FilterAlt, Fullscreen, FullscreenExit, GridView, History, WebAsset } from "@mui/icons-material";

import { GuiState, RightDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
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
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );
    const numberOfUnsavedRealizationFilters = useGuiValue(guiMessageBroker, GuiState.NumberOfUnsavedRealizationFilters);
    const numberOfEffectiveRealizationFilters = useGuiValue(
        guiMessageBroker,
        GuiState.NumberOfEffectiveRealizationFilters,
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
        if (targetContent === drawerContent) {
            hideSettingsPanel();
            return;
        }

        setDrawerContent(targetContent);
        ensureSettingsPanelIsVisible();
    }

    function handleModulesListClick() {
        togglePanelContent(RightDrawerContent.ModulesList);
    }

    function handleTemplatesListClick() {
        togglePanelContent(RightDrawerContent.TemplatesList);
    }

    function handleRealizationFilterClick() {
        togglePanelContent(RightDrawerContent.RealizationFilterSettings);
    }

    function handleModuleInstanceLogClick() {
        togglePanelContent(RightDrawerContent.ModuleInstanceLog);
    }

    return (
        <div
            className={resolveClassNames("bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-16")}
        >
            <div className="flex flex-col gap-2 grow">
                <NavBarButton
                    active={drawerContent === RightDrawerContent.ModulesList}
                    tooltip="Show modules list"
                    icon={<WebAsset fontSize="small" className="size-5" />}
                    onClick={handleModulesListClick}
                />
                <NavBarButton
                    active={drawerContent === RightDrawerContent.TemplatesList}
                    tooltip="Show templates list"
                    icon={<GridView fontSize="small" className="size-5" />}
                    onClick={handleTemplatesListClick}
                />
                <NavBarDivider />
                <NavBarButton
                    active={drawerContent === RightDrawerContent.RealizationFilterSettings}
                    tooltip={RealizationFilterButtonTooltip(
                        numberOfUnsavedRealizationFilters,
                        numberOfEffectiveRealizationFilters,
                    )}
                    icon={RealizationFilterButtonIcon(
                        numberOfUnsavedRealizationFilters,
                        numberOfEffectiveRealizationFilters,
                    )}
                    onClick={handleRealizationFilterClick}
                />

                <NavBarButton
                    icon={<History fontSize="small" className="size-5 mr-2" />}
                    active={drawerContent === RightDrawerContent.ModuleInstanceLog}
                    tooltip="Open module history"
                    onClick={handleModuleInstanceLogClick}
                />
                <NavBarDivider />
                <NavBarButton
                    active={isFullscreen}
                    icon={<Fullscreen fontSize="small" className="size-5 mr-2" />}
                    activeIcon={<FullscreenExit fontSize="small" className="size-5 mr-2" />}
                    tooltip="Fullscreen application (F11)"
                    onClick={toggleFullScreen}
                />
            </div>
        </div>
    );
};

function RealizationFilterButtonTooltip(
    numberOfUnsavedRealizationFilters: number,
    numberOfEffectiveRealizationFilters: number,
): React.ReactNode {
    return (
        <div>
            Open realization filter panel
            {numberOfUnsavedRealizationFilters ? (
                <>
                    <br />
                    {`* ${numberOfUnsavedRealizationFilters} unsaved filter${
                        numberOfUnsavedRealizationFilters > 1 ? "s" : ""
                    }`}
                </>
            ) : numberOfEffectiveRealizationFilters ? (
                <>
                    <br />
                    {`* ${numberOfEffectiveRealizationFilters} effective filter${
                        numberOfEffectiveRealizationFilters > 1 ? "s" : ""
                    }`}
                </>
            ) : null}
        </div>
    );
}

function RealizationFilterButtonIcon(
    numberOfUnsavedRealizationFilters: number,
    numberOfEffectiveRealizationFilters: number,
): React.ReactNode {
    return (
        <Badge
            badgeContent={numberOfUnsavedRealizationFilters ? "!" : numberOfEffectiveRealizationFilters || undefined}
            color={numberOfUnsavedRealizationFilters ? "bg-orange-500" : "bg-blue-500"}
            invisible={!numberOfUnsavedRealizationFilters && !numberOfEffectiveRealizationFilters}
        >
            <FilterAlt fontSize="small" className="size-5 mr-2" />
        </Badge>
    );
}

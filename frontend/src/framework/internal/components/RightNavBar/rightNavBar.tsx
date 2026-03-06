import type React from "react";

import { FilterAlt, History, Palette, WebAsset } from "@mui/icons-material";

import { GuiEvent, GuiState, RightDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import {
    SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT,
    SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT,
} from "../SettingsContentPanels";

type RightNavBarProps = {
    workbench: Workbench;
};

export const RightNavBar: React.FC<RightNavBarProps> = (props) => {
    const workbenchSession = props.workbench.getSessionManager().getActiveSession();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [drawerContent, setDrawerContent] = useGuiState(guiMessageBroker, GuiState.RightDrawerContent);

    const [rightSettingsPanelIsCollapsed, setRightSettingsPanelIsCollapsed] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelIsCollapsed,
    );
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const numberOfUnsavedRealizationFilters = useGuiValue(guiMessageBroker, GuiState.NumberOfUnsavedRealizationFilters);
    const numberOfEffectiveRealizationFilters = useGuiValue(
        guiMessageBroker,
        GuiState.NumberOfEffectiveRealizationFilters,
    );

    function forceSettingsPanelVisible() {
        setRightSettingsPanelWidth(SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT);
        setRightSettingsPanelIsCollapsed(false);
    }

    function ensureSettingsPanelIsVisible() {
        if (rightSettingsPanelWidth <= SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT) {
            forceSettingsPanelVisible();
        }
    }

    function handleSelectPanelContent(targetContent: RightDrawerContent) {
        const isSameContent = targetContent === drawerContent;
        if (isSameContent && rightSettingsPanelIsCollapsed) {
            forceSettingsPanelVisible();
            return;
        }
        if (isSameContent) {
            guiMessageBroker.publishEvent(GuiEvent.RequestRightSettingsPanelClose);
            return;
        }
        // Switch content
        setDrawerContent(targetContent);
        ensureSettingsPanelIsVisible();
    }

    function handleModulesListClick() {
        handleSelectPanelContent(RightDrawerContent.ModulesList);
    }

    function handleRealizationFilterClick() {
        handleSelectPanelContent(RightDrawerContent.RealizationFilterSettings);
    }

    function handleModuleInstanceLogClick() {
        handleSelectPanelContent(RightDrawerContent.ModuleInstanceLog);
    }

    function handleColorPaletteSettingsClick() {
        handleSelectPanelContent(RightDrawerContent.ColorPaletteSettings);
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
                    disabled={isSnapshot}
                    disabledTooltip="Modules cannot be changed in snapshot mode"
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
                    disabled={isSnapshot}
                    disabledTooltip="Realization filters cannot be changed in snapshot mode"
                />
                <NavBarButton
                    icon={<History fontSize="small" className="size-5 mr-2" />}
                    active={drawerContent === RightDrawerContent.ModuleInstanceLog}
                    tooltip="Open module log"
                    onClick={handleModuleInstanceLogClick}
                />
                <NavBarDivider />
                <NavBarButton
                    active={drawerContent === RightDrawerContent.ColorPaletteSettings}
                    tooltip="Show color settings"
                    icon={<Palette fontSize="small" className="size-5" />}
                    onClick={handleColorPaletteSettingsClick}
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

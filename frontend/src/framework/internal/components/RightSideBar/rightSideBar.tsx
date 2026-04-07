import type React from "react";

import { FilterAlt, History, Palette, WebAsset } from "@mui/icons-material";

import { GuiEvent, GuiState, RightDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { NavBarButton } from "@lib/components/NavBarComponents";
import { Separator } from "@lib/newComponents/Separator";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import {
    SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT,
    SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT,
} from "../SettingsContentPanels";
import { SideBar } from "../SideBar/sideBar";

type RightSideBarProps = {
    workbench: Workbench;
};

export const RightSideBar: React.FC<RightSideBarProps> = (props) => {
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
        <SideBar position="right">
            <div className="flex grow flex-col gap-2">
                <NavBarButton
                    active={drawerContent === RightDrawerContent.ModulesList}
                    tooltip="Show modules list"
                    icon={<WebAsset fontSize="small" />}
                    onClick={handleModulesListClick}
                    disabled={isSnapshot}
                    disabledTooltip="Modules cannot be changed in snapshot mode"
                />
                <Separator orientation="horizontal" />
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
                    icon={<History fontSize="small" />}
                    active={drawerContent === RightDrawerContent.ModuleInstanceLog}
                    tooltip="Open module log"
                    onClick={handleModuleInstanceLogClick}
                />
                <Separator orientation="horizontal" />
                <NavBarButton
                    active={drawerContent === RightDrawerContent.ColorPaletteSettings}
                    tooltip="Show color settings"
                    icon={<Palette fontSize="small" />}
                    onClick={handleColorPaletteSettingsClick}
                />
            </div>
        </SideBar>
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
            color={numberOfUnsavedRealizationFilters ? "bg-fill-warning-strong" : "bg-fill-accent-strong"}
            invisible={!numberOfUnsavedRealizationFilters && !numberOfEffectiveRealizationFilters}
        >
            <FilterAlt fontSize="small" />
        </Badge>
    );
}

import type React from "react";

import { FilterAlt, History, Palette, WebAsset } from "@mui/icons-material";

import { GuiEvent, GuiState, RightDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { NavBarButton } from "@lib/components/NavBarComponents";
import { Tabs } from "@lib/newComponents/Tabs";
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

    return (
        <SideBar position="right" className="">
            <Tabs.Root value={drawerContent} onValueChange={handleSelectPanelContent} orientation="vertical">
                <Tabs.List indicatorPosition="start">
                    <NavBarButton
                        value={RightDrawerContent.ModulesList}
                        tooltip="Show modules list"
                        icon={<WebAsset fontSize="small" />}
                        disabled={isSnapshot}
                        disabledTooltip="Modules cannot be changed in snapshot mode"
                    />
                    <NavBarButton
                        value={RightDrawerContent.RealizationFilterSettings}
                        tooltip={RealizationFilterButtonTooltip(
                            numberOfUnsavedRealizationFilters,
                            numberOfEffectiveRealizationFilters,
                        )}
                        icon={RealizationFilterButtonIcon(
                            numberOfUnsavedRealizationFilters,
                            numberOfEffectiveRealizationFilters,
                        )}
                        disabled={isSnapshot}
                        disabledTooltip="Realization filters cannot be changed in snapshot mode"
                    />
                    <NavBarButton
                        value={RightDrawerContent.ModuleInstanceLog}
                        icon={<History fontSize="small" />}
                        tooltip="Open module log"
                    />
                    <NavBarButton
                        value={RightDrawerContent.ColorPaletteSettings}
                        tooltip="Show color settings"
                        icon={<Palette fontSize="small" />}
                    />
                </Tabs.List>
            </Tabs.Root>
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
): React.ReactElement {
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

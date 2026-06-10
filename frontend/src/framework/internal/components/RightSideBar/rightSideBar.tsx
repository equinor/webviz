import type React from "react";

import {
    FilterAlt,
    FilterAltOutlined,
    History,
    HistoryOutlined,
    Palette,
    PaletteOutlined,
    WebAsset,
    WebAssetOutlined,
} from "@mui/icons-material";

import { GuiEvent, GuiState, RightDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/newComponents/Badge";
import { Tabs, type TabsTabProps } from "@lib/newComponents/Tabs";
import { Tooltip } from "@lib/newComponents/Tooltip";
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
                    <Toggle
                        value={RightDrawerContent.ModulesList}
                        tooltip="Show modules list"
                        icon={<WebAssetOutlined fontSize="small" />}
                        activeIcon={<WebAsset fontSize="small" />}
                        disabled={isSnapshot}
                        disabledTooltip="Modules cannot be changed in snapshot mode"
                    />
                    <Toggle
                        value={RightDrawerContent.RealizationFilterSettings}
                        tooltip={RealizationFilterButtonTooltip(
                            numberOfUnsavedRealizationFilters,
                            numberOfEffectiveRealizationFilters,
                        )}
                        icon={RealizationFilterButtonIcon(
                            numberOfUnsavedRealizationFilters,
                            numberOfEffectiveRealizationFilters,
                            false,
                        )}
                        activeIcon={RealizationFilterButtonIcon(
                            numberOfUnsavedRealizationFilters,
                            numberOfEffectiveRealizationFilters,
                            true,
                        )}
                        disabled={isSnapshot}
                        disabledTooltip="Realization filters cannot be changed in snapshot mode"
                    />
                    <Toggle
                        value={RightDrawerContent.ModuleInstanceLog}
                        icon={<HistoryOutlined fontSize="small" />}
                        activeIcon={<History fontSize="small" />}
                        tooltip="Open module log"
                    />
                    <Toggle
                        value={RightDrawerContent.ColorPaletteSettings}
                        tooltip="Show color settings"
                        icon={<PaletteOutlined fontSize="small" />}
                        activeIcon={<Palette fontSize="small" />}
                    />
                </Tabs.List>
            </Tabs.Root>
        </SideBar>
    );
};

type ToggleProps = TabsTabProps & {
    value: string;
    /**
     * The icon rendered on the left side of the text
     */
    icon: React.ReactElement;
    /**
     * An alternate icon to use when the button is in it's "active" state
     */
    activeIcon?: React.ReactElement;
    /**
     * Tooltip text
     */
    tooltip?: string;
    /**
     * Tooltip text when disabled
     */
    disabledTooltip?: string;
};

function resolveTabIcon(
    icon: React.ReactElement,
    activeIcon: React.ReactElement | undefined,
    isActive: boolean,
): React.ReactNode {
    if (isActive) return activeIcon ?? icon;
    return icon;
}

function Toggle(props: ToggleProps) {
    const { icon, activeIcon, disabledTooltip, tooltip, ...baseProps } = props;
    return (
        <Tooltip content={props.disabled ? disabledTooltip : tooltip} side="left">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span>
                <Tabs.Tab {...baseProps}>{({ isActive }) => resolveTabIcon(icon, activeIcon, isActive)}</Tabs.Tab>
            </span>
        </Tooltip>
    );
}

function RealizationFilterButtonTooltip(
    numberOfUnsavedRealizationFilters: number,
    numberOfEffectiveRealizationFilters: number,
): string {
    let tooltip = "Open realization filter panel";
    if (numberOfUnsavedRealizationFilters) {
        tooltip += `\n* ${numberOfUnsavedRealizationFilters} unsaved filter${
            numberOfUnsavedRealizationFilters > 1 ? "s" : ""
        }`;
    } else if (numberOfEffectiveRealizationFilters) {
        tooltip += `\n* ${numberOfEffectiveRealizationFilters} effective filter${
            numberOfEffectiveRealizationFilters > 1 ? "s" : ""
        }`;
    }
    return tooltip;
}

function RealizationFilterButtonIcon(
    numberOfUnsavedRealizationFilters: number,
    numberOfEffectiveRealizationFilters: number,
    active: boolean,
): React.ReactElement {
    return (
        <Badge
            badgeContent={numberOfUnsavedRealizationFilters ? "!" : numberOfEffectiveRealizationFilters || undefined}
            tone={numberOfUnsavedRealizationFilters ? "warning" : "accent"}
            invisible={!numberOfUnsavedRealizationFilters && !numberOfEffectiveRealizationFilters}
        >
            {active ? <FilterAlt fontSize="small" /> : <FilterAltOutlined fontSize="small" />}
        </Badge>
    );
}

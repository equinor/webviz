import type React from "react";

import { Link, List, Palette, Tune } from "@mui/icons-material";

import { GuiState, LeftDrawerContent, useGuiState } from "@framework/GuiMessageBroker";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type LeftNavBarProps = {
    workbench: Workbench;
};

export const LeftNavBar: React.FC<LeftNavBarProps> = (props) => {
    const workbenchSession = props.workbench.getWorkbenchSession();
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const dashboard = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
    const layout = usePublishSubscribeTopicValue(dashboard, DashboardTopic.Layout);
    const [ensembleDialogOpen, setEnsembleDialogOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.EnsembleDialogOpen,
    );
    const loadingEnsembleSet = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING,
    );
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftDrawerContent,
    );
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent,
    );

    function ensureSettingsPanelIsVisible() {
        if (leftSettingsPanelWidth <= 5) {
            setLeftSettingsPanelWidth(20);
        }
    }

    function togglePanelContent(targetContent: LeftDrawerContent) {
        setDrawerContent(targetContent);
        ensureSettingsPanelIsVisible();
    }

    function handleEnsembleClick() {
        setEnsembleDialogOpen(true);
    }

    function handleModuleSettingsClick() {
        togglePanelContent(LeftDrawerContent.ModuleSettings);
    }

    function handleSyncSettingsClick() {
        togglePanelContent(LeftDrawerContent.SyncSettings);
    }

    function handleColorPaletteSettingsClick() {
        togglePanelContent(LeftDrawerContent.ColorPaletteSettings);
    }

    const layoutEmpty = layout.length === 0;

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 pt-4 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-16",
            )}
        >
            <div className="flex flex-col gap-2 grow">
                <NavBarButton
                    active={ensembleDialogOpen}
                    tooltip={"Open ensemble selection dialog"}
                    icon={
                        <Badge
                            invisible={ensembleSet.getEnsembleArray().length === 0 && !loadingEnsembleSet}
                            color="bg-blue-500"
                            badgeContent={
                                loadingEnsembleSet ? (
                                    <CircularProgress size="extra-small" color="inherit" />
                                ) : (
                                    ensembleSet.getEnsembleArray().length
                                )
                            }
                        >
                            <List fontSize="small" className="size-5" />
                        </Badge>
                    }
                    onClick={handleEnsembleClick}
                />
                <NavBarDivider />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ModuleSettings}
                    tooltip="Show module settings"
                    icon={<Tune fontSize="small" className="size-5" />}
                    onClick={handleModuleSettingsClick}
                    disabled={layoutEmpty}
                />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.SyncSettings}
                    tooltip="Show sync settings"
                    icon={<Link fontSize="small" className="size-5" />}
                    onClick={handleSyncSettingsClick}
                    disabled={layoutEmpty}
                />
                <NavBarDivider />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ColorPaletteSettings}
                    tooltip="Show color settings"
                    icon={<Palette fontSize="small" className="size-5" />}
                    onClick={handleColorPaletteSettingsClick}
                />

                <div className="grow h-5" />
            </div>
        </div>
    );
};

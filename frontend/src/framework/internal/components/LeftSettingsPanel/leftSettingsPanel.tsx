import React from "react";

import { Tune, Settings, Link } from "@mui/icons-material";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

import { ModuleSettings } from "./private-components/moduleSettings";
import { ModuleSettingsHeader } from "./private-components/moduleSettingsHeader";
import { ModuleSyncSettings } from "./private-components/moduleSyncSettings";

enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    SyncSettings = "SyncSettings",
}

type LeftSettingsPanelProps = {
    workbench: Workbench;
};

export function LeftSettingsPanel(props: LeftSettingsPanelProps): React.ReactNode {
    const [isCollapsed, setIsCollapsed] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelIsCollapsed,
    );
    const [drawerContent, setDrawerContent] = React.useState<DrawerContent>(DrawerContent.ModuleSettings);

    const dashboard = useActiveDashboard();
    const moduleInstances = dashboard.getModuleInstances();
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const activeModuleInstance = activeModuleInstanceId ? dashboard.getModuleInstance(activeModuleInstanceId) : null;

    function handleSetDrawerContent(content: string) {
        if (content in DrawerContent) {
            setDrawerContent(content as DrawerContent);
            return;
        }
        setDrawerContent(DrawerContent.ModuleSettings);
    }

    function handleExpandPanel() {
        setIsCollapsed(false);
    }

    function handleCollapsePanel() {
        setIsCollapsed(true);
    }

    return (
        <div
            className={resolveClassNames("h-full", isCollapsed ? "bg-slate-100" : "bg-white")}
            style={{ boxShadow: "4px 0px 4px 1px rgba(0, 0, 0, 0.05)" }}
        >
            <ModuleSettingsHeader
                activeTab={drawerContent}
                availableTabs={{
                    [DrawerContent.ModuleSettings]: {
                        title: "Module Settings",
                        icon: <Settings fontSize="small" />,
                    },
                    [DrawerContent.SyncSettings]: {
                        title: "Sync Settings",
                        icon: <Link fontSize="small" />,
                    },
                }}
                activeModuleInstance={activeModuleInstance}
                isCollapsed={isCollapsed}
                onExpandClick={handleExpandPanel}
                onCollapseClick={handleCollapsePanel}
                onTabChange={handleSetDrawerContent}
            />
            <>
                <ModuleSyncSettings
                    workbench={props.workbench}
                    visible={!isCollapsed && drawerContent === DrawerContent.SyncSettings}
                />
                <div
                    className={resolveClassNames(
                        !isCollapsed && drawerContent === DrawerContent.ModuleSettings ? "flex flex-col" : "hidden",
                        "h-full",
                        "w-full",
                    )}
                >
                    {moduleInstances.map((instance) => (
                        <ModuleSettings key={instance.getId()} workbench={props.workbench} moduleInstance={instance} />
                    ))}
                    {moduleInstances.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Tune fontSize="large" className="text-slate-200" />
                        </div>
                    )}
                </div>
            </>
        </div>
    );
}

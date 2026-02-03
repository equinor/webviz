import React from "react";

import { Link, Settings, Tune } from "@mui/icons-material";

import { GuiState, useSetGuiState, useGuiState } from "@framework/GuiMessageBroker";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { SettingsPanelHeader } from "../SettingsPanelHeader";

import { ModuleSettings } from "./private-components/moduleSettings";
import { SyncSettings } from "./private-components/syncSettings";

// The drawer content is local, no need to use guiMessageBroker
enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    SyncSettings = "SyncSettings",
}

type LeftSettingsPanelProps = {
    workbench: Workbench;
};

export const LeftSettingsPanel: React.FC<LeftSettingsPanelProps> = (props) => {
    const mainRef = React.useRef<HTMLDivElement>(null);
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);

    const activeModuleInstance = moduleInstances.find((instance) => instance.getId() === activeModuleInstanceId);

    const [drawerContent, setDrawerContent] = React.useState<DrawerContent>(DrawerContent.ModuleSettings);

    const [isCollapsed, setIsCollapsed] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelIsCollapsed,
    );
    const setLeftSettingsPanelWidth = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent,
    );

    function handleExpandPanel() {
        // Set some default width, minSize/collapsedSizes for ResizablePanels should handle the rest
        setLeftSettingsPanelWidth(10);
        setIsCollapsed(false);
    }

    function handleCollapsePanel() {
        // Request zero width, minSize/collapsedSizes for ResizablePanels should handle the rest
        setLeftSettingsPanelWidth(0);
        setIsCollapsed(true);
    }

    function handleSetDrawerContent(content: string) {
        if (mainRef.current === null) {
            return;
        }
        if (content in DrawerContent) {
            setDrawerContent(content as DrawerContent);
            return;
        }
        setDrawerContent(DrawerContent.ModuleSettings);
    }

    return (
        <div ref={mainRef} className="bg-white h-full" style={{ boxShadow: "4px 0px 4px 1px rgba(0, 0, 0, 0.05)" }}>
            <SettingsPanelHeader
                activeSetting={drawerContent}
                availableSettings={{
                    [DrawerContent.ModuleSettings]: {
                        title: "Module Settings",
                        icon: <Settings fontSize="small" />,
                    },
                    [DrawerContent.SyncSettings]: {
                        title: "Sync Settings",
                        icon: <Link fontSize="small" />,
                    },
                }}
                isCollapsed={isCollapsed}
                onExpandClick={handleExpandPanel}
                onCollapseClick={handleCollapsePanel}
                onSettingChange={handleSetDrawerContent}
            />
            <SyncSettings
                workbench={props.workbench}
                visible={!isCollapsed && drawerContent === DrawerContent.SyncSettings}
            />
            <div
                className={resolveClassNames(
                    !isCollapsed && drawerContent === DrawerContent.ModuleSettings ? "block" : "hidden",
                    "h-full",
                    "w-full",
                )}
            >
                {moduleInstances.map((instance) => (
                    <ModuleSettings key={instance.getId()} moduleInstance={instance} workbench={props.workbench} />
                ))}
                {moduleInstances.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Tune fontSize="large" className="text-slate-200" />
                    </div>
                )}
            </div>
        </div>
    );
};

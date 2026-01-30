import React from "react";

import { Tune } from "@mui/icons-material";

import { DashboardTopic } from "@framework/internal/Dashboard";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

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
    const [drawerContent, setDrawerContent] = React.useState<DrawerContent>(DrawerContent.ModuleSettings);
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const mainRef = React.useRef<HTMLDivElement>(null);

    function handleOpenSyncSettings() {
        if (mainRef.current === null) {
            return;
        }
        setDrawerContent(DrawerContent.SyncSettings);
    }

    function handleCloseSyncSettings() {
        if (mainRef.current === null) {
            return;
        }
        setDrawerContent(DrawerContent.ModuleSettings);
    }

    return (
        <div ref={mainRef} className="bg-white h-full" style={{ boxShadow: "4px 0px 4px 1px rgba(0, 0, 0, 0.05)" }}>
            <SyncSettings
                workbench={props.workbench}
                visible={drawerContent === DrawerContent.SyncSettings}
                onClose={handleCloseSyncSettings}
            />
            <div
                className={resolveClassNames(
                    drawerContent === DrawerContent.ModuleSettings ? "block" : "hidden",
                    "h-full",
                    "w-full",
                )}
            >
                {moduleInstances.map((instance) => (
                    <ModuleSettings
                        key={instance.getId()}
                        moduleInstance={instance}
                        workbench={props.workbench}
                        onRequestOpenSyncSettings={handleOpenSyncSettings}
                    />
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

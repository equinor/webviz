import React from "react";

import { Tooltip } from "@equinor/eds-core-react";

import { Drawer } from "@framework/internal/components/Drawer";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { SyncSettingKey } from "@framework/SyncSettings";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import type { Workbench } from "@framework/Workbench";
import { Checkbox } from "@lib/newComponents/Checkbox";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";

import { EmptySettingsPlaceholder } from "./emptySettingsPlaceholder";

type ModuleSyncSettingProps = {
    workbench: Workbench;
    visible: boolean;
};

export function ModuleSyncSettings(props: ModuleSyncSettingProps): React.ReactNode {
    const dashboard = useActiveDashboard();
    const workbenchSession = useActiveSession();
    const moduleInstances = dashboard.getModuleInstances();
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const forceRerender = React.useReducer((x) => x + 1, 0)[1];

    const activeModuleInstance = activeModuleInstanceId ? dashboard.getModuleInstance(activeModuleInstanceId) : null;

    function handleSyncSettingChange(setting: SyncSettingKey, value: boolean) {
        if (!activeModuleInstance) {
            return;
        }

        if (value) {
            if (!activeModuleInstance.isSyncedSetting(setting)) {
                activeModuleInstance.addSyncedSetting(setting);
            }
        } else {
            activeModuleInstance.removeSyncedSetting(setting);
        }

        forceRerender();
    }

    function handleGlobalSyncSettingChange(setting: SyncSettingKey, value: boolean) {
        // @rmt: This has to be changed as soon as we support multiple pages
        for (const moduleInstance of moduleInstances) {
            if (moduleInstance.getModule().hasSyncableSettingKey(setting)) {
                if (value) {
                    if (!moduleInstance.isSyncedSetting(setting)) {
                        moduleInstance.addSyncedSetting(setting);
                    }
                } else {
                    moduleInstance.removeSyncedSetting(setting);
                }
            }
        }

        forceRerender();
    }

    function isGlobalSyncSetting(setting: SyncSettingKey): boolean {
        // @rmt: This has to be changed as soon as we support multiple pages
        for (const moduleInstance of moduleInstances) {
            if (moduleInstance.getModule().hasSyncableSettingKey(setting)) {
                if (!moduleInstance.isSyncedSetting(setting)) {
                    return false;
                }
            }
        }

        return true;
    }

    function makeContent() {
        const syncableSettingKeys = activeModuleInstance?.getModule().getSyncableSettingKeys() ?? [];

        if (activeModuleInstanceId === "" || !activeModuleInstance) {
            return <EmptySettingsPlaceholder text="No module selected" />;
        }

        if (syncableSettingKeys.length === 0) {
            return <EmptySettingsPlaceholder text="No syncable settings" />;
        }

        const disabledReason = isSnapshot ? "Sync settings cannot be changed in snapshot mode" : undefined;

        return (
            <table className="w-full">
                <thead>
                    <tr className="border-neutral-subtle border-b">
                        <th
                            className="border-neutral-subtle px-xs py-xs w-4 border-r"
                            title="Sync for all module instances"
                        >
                            Global
                        </th>
                        <th
                            className="border-neutral-subtle px-xs py-xs w-4 border-r"
                            title="Sync for active module instance"
                        >
                            Local
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {syncableSettingKeys.map((setting) => {
                        const globallySynced = isGlobalSyncSetting(setting);
                        return (
                            <tr key={setting} className="hover:bg-neutral-subtle">
                                <Tooltip title={disabledReason} disabled={!isSnapshot}>
                                    <td className="border-neutral-subtle px-xs py-3xs align-center border-r">
                                        <Checkbox
                                            checked={globallySynced}
                                            onCheckedChange={(checked) =>
                                                handleGlobalSyncSettingChange(setting, checked)
                                            }
                                            disabled={isSnapshot}
                                            size="small"
                                        />
                                    </td>
                                </Tooltip>
                                <Tooltip title={disabledReason} disabled={!isSnapshot}>
                                    <td className="border-neutral-subtle px-xs py-3xs align-center border-r">
                                        <Checkbox
                                            checked={globallySynced || activeModuleInstance.isSyncedSetting(setting)}
                                            onCheckedChange={(checked) => handleSyncSettingChange(setting, checked)}
                                            disabled={isSnapshot}
                                            size="small"
                                        />
                                    </td>
                                </Tooltip>

                                <td
                                    className={resolveClassNames("px-xs py-3xs", {
                                        "opacity-50": isSnapshot,
                                    })}
                                >
                                    {SyncSettingsMeta[setting].name}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    return <Drawer visible={props.visible}>{makeContent()}</Drawer>;
}

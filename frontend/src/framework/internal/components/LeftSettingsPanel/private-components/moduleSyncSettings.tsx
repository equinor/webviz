import React from "react";

import { Tooltip } from "@equinor/eds-core-react";
import { PinDrop, Public } from "@mui/icons-material";

import { Drawer } from "@framework/internal/components/Drawer";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { SyncSettingKey } from "@framework/SyncSettings";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import type { Workbench } from "@framework/Workbench";
import { Checkbox } from "@lib/components/Checkbox";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";

type ModuleSyncSettingProps = {
    workbench: Workbench;
    visible: boolean;
};

export const ModuleSyncSettings: React.FC<ModuleSyncSettingProps> = (props) => {
    const dashboard = useActiveDashboard();
    const workbenchSession = useActiveSession();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const forceRerender = React.useReducer((x) => x + 1, 0)[1];

    const activeModuleInstance = moduleInstances.find((instance) => instance.getId() === activeModuleInstanceId);

    function handleSyncSettingChange(setting: SyncSettingKey, value: boolean) {
        if (activeModuleInstance === undefined) {
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

        if (activeModuleInstanceId === "" || activeModuleInstance === undefined) {
            return <div className="text-gray-500 m-2">No module selected</div>;
        }

        if (syncableSettingKeys.length === 0) {
            return <div className="text-gray-500 m-2">No syncable settings</div>;
        }

        const disabledReason = isSnapshot ? "Sync settings cannot be changed in snapshot mode" : undefined;

        return (
            <table className="w-full m-2">
                <thead>
                    <tr className="border-b ">
                        <th className="border-r p-2 w-6" title="Sync for all module instances">
                            <Public fontSize="small" />
                        </th>
                        <th className="border-r p-2 w-6" title="Sync for active module instance">
                            <PinDrop fontSize="small" />
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {syncableSettingKeys.map((setting) => {
                        const globallySynced = isGlobalSyncSetting(setting);
                        return (
                            <tr key={setting} className="hover:bg-blue-50">
                                <Tooltip title={disabledReason} disabled={!isSnapshot}>
                                    <td className="border-r p-2">
                                        <Checkbox
                                            checked={globallySynced}
                                            onChange={(e) => handleGlobalSyncSettingChange(setting, e.target.checked)}
                                            disabled={isSnapshot}
                                        />
                                    </td>
                                </Tooltip>
                                <Tooltip title={disabledReason} disabled={!isSnapshot}>
                                    <td className="border-r p-2">
                                        <Checkbox
                                            checked={globallySynced || activeModuleInstance.isSyncedSetting(setting)}
                                            onChange={(e) => handleSyncSettingChange(setting, e.target.checked)}
                                            disabled={isSnapshot}
                                        />
                                    </td>
                                </Tooltip>

                                <td className={resolveClassNames("p-2", { "opacity-50": isSnapshot })}>
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
};

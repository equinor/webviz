import React from "react";

import { Link, Public, Tune } from "@mui/icons-material";

import { GuiState, LeftDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { SyncSettingKey } from "@framework/SyncSettings";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import type { Workbench } from "@framework/Workbench";
import { Checkbox } from "@lib/components/Checkbox";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";

type ModulesListProps = {
    workbench: Workbench;
};

type SyncKeyModuleGroup = {
    setting: SyncSettingKey;
    modules: Array<{
        instanceId: string;
        title: string;
        isSynced: boolean;
        supportsSyncKey: boolean;
    }>;
};

export const SyncSettings: React.FC<ModulesListProps> = (props) => {
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);

    const forceRerender = React.useReducer((x) => x + 1, 0)[1];
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.LeftDrawerContent);

    function handleSyncSettingChange(instanceId: string, setting: SyncSettingKey, value: boolean) {
        const instance = moduleInstances.find((inst) => inst.getId() === instanceId);
        if (!instance) return;

        if (value) {
            if (!instance.isSyncedSetting(setting)) {
                instance.addSyncedSetting(setting);
            }
        } else {
            instance.removeSyncedSetting(setting);
        }

        forceRerender();
    }

    function handleGlobalSyncSettingChange(setting: SyncSettingKey, value: boolean) {
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
        let hasAny = false;
        for (const moduleInstance of moduleInstances) {
            if (moduleInstance.getModule().hasSyncableSettingKey(setting)) {
                hasAny = true;
                if (!moduleInstance.isSyncedSetting(setting)) {
                    return false;
                }
            }
        }

        return hasAny;
    }

    function handleNavigateToModule(moduleInstanceId: string) {
        dashboard.setActiveModuleInstanceId(moduleInstanceId);
        const guiMessageBroker = props.workbench.getGuiMessageBroker();
        guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        const currentWidth = guiMessageBroker.getState(GuiState.LeftSettingsPanelWidthInPercent);
        if (currentWidth <= 5) {
            guiMessageBroker.setState(GuiState.LeftSettingsPanelWidthInPercent, 20);
        }
    }

    function makeContent() {
        // Collect ALL sync setting keys used across the entire dashboard
        const allSyncKeysSet = new Set<SyncSettingKey>();
        for (const instance of moduleInstances) {
            for (const key of instance.getModule().getSyncableSettingKeys()) {
                allSyncKeysSet.add(key);
            }
        }

        const allSyncKeys = Array.from(allSyncKeysSet);

        if (moduleInstances.length === 0) {
            return <div className="text-gray-500 m-2">No modules in dashboard</div>;
        }

        if (allSyncKeys.length === 0) {
            return <div className="text-gray-500 m-2">No syncable settings available</div>;
        }

        // Group by sync setting key, showing all modules that support each key
        const groups: SyncKeyModuleGroup[] = allSyncKeys.map((setting) => ({
            setting,
            modules: moduleInstances
                .filter((inst) => inst.getModule().hasSyncableSettingKey(setting))
                .map((inst) => ({
                    instanceId: inst.getId(),
                    title: inst.getTitle(),
                    isSynced: inst.isSyncedSetting(setting),
                    supportsSyncKey: true,
                })),
        }));

        return (
            <div className="flex flex-col gap-3 p-2">
                {groups.map((group) => {
                    const globallySynced = isGlobalSyncSetting(group.setting);
                    const someModulesSynced = group.modules.some((m) => m.isSynced);

                    return (
                        <div
                            key={group.setting}
                            className="border border-slate-200 rounded bg-white"
                        >
                            {/* Sync key header with global toggle */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 rounded-t">
                                <Checkbox
                                    checked={globallySynced}
                                    indeterminate={!globallySynced && someModulesSynced}
                                    onChange={(e) =>
                                        handleGlobalSyncSettingChange(group.setting, e.target.checked)
                                    }
                                />
                                <Tooltip title="Toggle sync for all modules that support this setting">
                                    <div className="flex items-center gap-1.5 cursor-default">
                                        <Public style={{ fontSize: 14 }} className="text-slate-500" />
                                        <span className="font-semibold text-sm">
                                            {SyncSettingsMeta[group.setting].name}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-1">
                                            ({group.modules.length} module{group.modules.length !== 1 ? "s" : ""})
                                        </span>
                                    </div>
                                </Tooltip>
                            </div>
                            {/* Per-module toggles */}
                            <div className="flex flex-col divide-y divide-slate-100">
                                {group.modules.map((mod) => (
                                    <div
                                        key={mod.instanceId}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 transition-colors"
                                    >
                                        <Checkbox
                                            checked={mod.isSynced}
                                            disabled={globallySynced}
                                            onChange={(e) =>
                                                handleSyncSettingChange(
                                                    mod.instanceId,
                                                    group.setting,
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        <Tooltip title={`Click to view settings for "${mod.title}"`}>
                                            <button
                                                className="text-xs text-left text-slate-700 hover:text-blue-700 cursor-pointer truncate max-w-[200px]"
                                                onClick={() => handleNavigateToModule(mod.instanceId)}
                                            >
                                                <Tune style={{ fontSize: 12 }} className="mr-1 align-text-bottom" />
                                                {mod.title}
                                            </button>
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <Drawer title="Sync settings — All modules" icon={<Link />} visible={drawerContent === LeftDrawerContent.SyncSettings}>
            {makeContent()}
        </Drawer>
    );
};

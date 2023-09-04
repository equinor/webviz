import React from "react";

import { useStoreValue } from "@framework/StateStore";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { useActiveModuleId } from "@framework/internal/hooks/workbenchHooks";
import { GlobeAltIcon, LinkIcon, MapPinIcon } from "@heroicons/react/20/solid";
import { Checkbox } from "@lib/components/Checkbox";

type ModulesListProps = {
    workbench: Workbench;
};

export const SyncSettings: React.FC<ModulesListProps> = (props) => {
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];
    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");
    const activeModuleId = useActiveModuleId(props.workbench);

    const activeModuleInstance = props.workbench.getModuleInstance(activeModuleId);

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
        const moduleInstances = props.workbench.getModuleInstances();

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
        const moduleInstances = props.workbench.getModuleInstances();

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

    return (
        <Drawer title="Sync settings" icon={<LinkIcon />} visible={drawerContent === DrawerContent.SyncSettings}>
            {activeModuleId === "" || activeModuleInstance === undefined ? (
                <div className="text-gray-500">No module selected</div>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="border-r p-2 w-6">
                                <GlobeAltIcon className="w-4 h-4" title="Sync for all module instances" />
                            </th>
                            <th className="border-r p-2 w-6">
                                <MapPinIcon className="w-4 h-4" title="Sync for active module instance" />
                            </th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeModuleInstance
                            .getModule()
                            .getSyncableSettingKeys()
                            .map((setting) => {
                                const globallySynced = isGlobalSyncSetting(setting);
                                return (
                                    <tr key={setting} className="hover:bg-blue-50">
                                        <td className="border-r p-2">
                                            <Checkbox
                                                checked={globallySynced}
                                                onChange={(e) =>
                                                    handleGlobalSyncSettingChange(setting, e.target.checked)
                                                }
                                            />
                                        </td>
                                        <td className="border-r p-2">
                                            <Checkbox
                                                checked={
                                                    globallySynced || activeModuleInstance.isSyncedSetting(setting)
                                                }
                                                onChange={(e) => handleSyncSettingChange(setting, e.target.checked)}
                                            />
                                        </td>
                                        <td className="p-2">{SyncSettingsMeta[setting].name}</td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            )}
        </Drawer>
    );
};

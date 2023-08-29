import React from "react";

import { useStoreValue } from "@framework/StateStore";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { useActiveModuleId } from "@framework/internal/hooks/workbenchHooks";
import { LinkIcon } from "@heroicons/react/20/solid";
import { Checkbox } from "@lib/components/Checkbox";

type ModulesListProps = {
    workbench: Workbench;
};

export const SyncSettings: React.FC<ModulesListProps> = (props) => {
    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");
    const activeModuleId = useActiveModuleId(props.workbench);

    const activeModuleInstance = props.workbench.getModuleInstance(activeModuleId);

    const handleSyncSettingChange = (setting: SyncSettingKey, value: boolean) => {
        if (activeModuleInstance === undefined) {
            return;
        }

        if (value) {
            activeModuleInstance.addSyncedSetting(setting);
        } else {
            activeModuleInstance.removeSyncedSetting(setting);
        }
    };

    return (
        <Drawer title="Sync settings" icon={<LinkIcon />} visible={drawerContent === DrawerContent.SyncSettings}>
            {activeModuleId === "" || activeModuleInstance === undefined ? (
                <div className="text-gray-500">No module selected</div>
            ) : (
                <>
                    {activeModuleInstance
                        .getModule()
                        .getSyncableSettingKeys()
                        .map((setting) => {
                            return (
                                <div className="mb-2" key={`${activeModuleInstance.getId()}-${setting}`}>
                                    <Checkbox
                                        checked={activeModuleInstance.isSyncedSetting(setting)}
                                        onChange={(e) => handleSyncSettingChange(setting, e.target.checked)}
                                        label={SyncSettingsMeta[setting].name}
                                    />
                                </div>
                            );
                        })}
                </>
            )}
        </Drawer>
    );
};

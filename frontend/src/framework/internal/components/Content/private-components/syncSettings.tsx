import React from "react";

import { useStoreState } from "@framework/StateStore";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { useActiveModuleId } from "@framework/internal/hooks/workbenchHooks";
import { Checkbox } from "@lib/components/Checkbox";

import { Drawer } from "./drawer";

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

export const GroupModules: React.FC<ModulesListProps> = (props) => {
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
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

    const handleDrawerClose = () => {
        setDrawerContent(DrawerContent.None);
    };

    return (
        <Drawer
            title="Synced settings"
            visible={drawerContent === DrawerContent.SyncSettings}
            onClose={handleDrawerClose}
        >
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

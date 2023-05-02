import React from "react";

import { useSetStoreValue, useStoreValue } from "@framework/StateStore";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { Workbench } from "@framework/Workbench";
import { useActiveModuleId } from "@framework/hooks/workbenchHooks";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Checkbox } from "@lib/components/Checkbox";
import { IconButton } from "@lib/components/IconButton";

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

export const GroupModules: React.FC<ModulesListProps> = (props) => {
    const visible = useStoreValue(props.workbench.getGuiStateStore(), "syncSettingsActive");
    const activeModuleId = useActiveModuleId(props.workbench);
    const setSyncSettingsActive = useSetStoreValue(props.workbench.getGuiStateStore(), "syncSettingsActive");

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
        <div className={`flex flex-col shadow bg-white p-4 w-96 min-h-0 h-full${visible ? "" : " hidden"}`}>
            <div className="flex-grow min-h-0 overflow-y-auto max-h-full h-0">
                <div className="flex justify-center items-center mb-4">
                    <span className="text-lg flex-grow p-0">Synced settings</span>
                    <IconButton onClick={() => setSyncSettingsActive(false)} title="Close sync settings">
                        <XMarkIcon className="w-5 h-5" />
                    </IconButton>
                </div>
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
            </div>
        </div>
    );
};

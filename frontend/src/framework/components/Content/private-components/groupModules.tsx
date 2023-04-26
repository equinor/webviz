import React from "react";

import { SyncSettings, SyncSettingsAbbreviations, SyncSettingsNames } from "@framework/Module";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { useActiveModuleId } from "@framework/hooks/workbenchHooks";
import { Checkbox } from "@lib/components/Checkbox";

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

/*
    @rmt: This component does probably need virtualization and therefore refactoring. 
    As this includes a lot more implementation, 
    I will skip it for now and come back to it when it becomes a problem.
*/
export const GroupModules: React.FC<ModulesListProps> = (props) => {
    const visible = useStoreValue(props.workbench.getGuiStateStore(), "groupModulesOpen");
    const activeModuleId = useActiveModuleId(props.workbench);

    const activeModuleInstance = props.workbench.getModuleInstance(activeModuleId);

    const handleSyncSettingChange = (setting: SyncSettings, value: boolean) => {
        if (activeModuleInstance === undefined) {
            return;
        }

        if (value) {
            activeModuleInstance.syncSetting(setting);
        } else {
            activeModuleInstance.unsyncSetting(setting);
        }
    };

    return (
        <div className={`flex flex-col bg-white p-4 w-96 min-h-0 h-full${visible ? "" : " hidden"}`}>
            <div className="mt-4 flex-grow min-h-0 overflow-y-auto max-h-full h-0">
                <h4>Settings</h4>
                {activeModuleId === "" || activeModuleInstance === undefined ? (
                    <div className="text-gray-500">No module selected</div>
                ) : (
                    <>
                        {activeModuleInstance
                            .getModule()
                            .getSyncableSettings()
                            .map((setting) => {
                                return (
                                    <div key={SyncSettingsAbbreviations[setting]} className="flex flex-row">
                                        <div className="flex-grow">{SyncSettingsNames[setting]}</div>
                                        <div className="flex-grow">
                                            <Checkbox
                                                checked={activeModuleInstance.isSyncedSetting(setting)}
                                                onChange={(e) => handleSyncSettingChange(setting, e.target.checked)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </>
                )}
            </div>
        </div>
    );
};

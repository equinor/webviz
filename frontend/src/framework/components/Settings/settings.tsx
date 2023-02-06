import React from "react";

import { ImportState } from "@framework/Module";
import { Workbench } from "@framework/Workbench";
import { useActiveModuleId } from "@framework/hooks/workbenchHooks";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = props.workbench.getModuleInstances();
    const activeModuleId = useActiveModuleId(props.workbench);

    return (
        <div className="bg-white p-4 w-72">
            {moduleInstances.map((instance) => {
                if (instance.getImportState() !== ImportState.Imported) {
                    return null;
                }

                const Settings = instance.getSettingsFC();

                return (
                    <div
                        key={instance.getId()}
                        style={{
                            display: activeModuleId === instance.getId() ? "block" : "none",
                        }}
                    >
                        <Settings
                            moduleContext={instance.getOrCreateContext()}
                            workbenchServices={props.workbench.getWorkbenchServices()}
                        />
                    </div>
                );
            })}
        </div>
    );
};

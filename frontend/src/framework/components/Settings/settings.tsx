import React from "react";

import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/hooks/workbenchHooks";

import { Setting } from "./private-components/setting";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleId = useActiveModuleId(props.workbench);

    const syncSettingsActive = useStoreValue(props.workbench.getGuiStateStore(), "syncSettingsActive");

    if (syncSettingsActive) {
        return null;
    }

    return (
        <div className="bg-white p-4">
            {moduleInstances.map((instance) => (
                <Setting
                    key={instance.getId()}
                    moduleInstance={instance}
                    activeModuleId={activeModuleId}
                    workbench={props.workbench}
                />
            ))}
        </div>
    );
};

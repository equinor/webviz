import React from "react";

import { Workbench } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/hooks/workbenchHooks";

import { Setting } from "./private-components/setting";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleId = useActiveModuleId(props.workbench);

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

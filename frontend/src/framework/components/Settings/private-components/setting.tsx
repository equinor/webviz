import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { useImportState } from "@framework/hooks/moduleHooks";

type SettingProps = {
    moduleInstance: ModuleInstance<any, any, any>;
    activeModuleId: string;
    workbench: Workbench;
};

export const Setting: React.FC<SettingProps> = (props) => {
    const importState = useImportState(props.moduleInstance);

    if (importState !== ImportState.Imported || !props.moduleInstance.isInitialised()) {
        return null;
    }

    const Settings = props.moduleInstance.getSettingsFC();
    return (
        <div
            key={props.moduleInstance.getId()}
            style={{
                display: props.activeModuleId === props.moduleInstance.getId() ? "flex" : "none",
            }}
            className="flex-col gap-4"
        >
            <Settings
                moduleContext={props.moduleInstance.getContext()}
                workbenchServices={props.workbench.getWorkbenchServices()}
            />
        </div>
    );
};

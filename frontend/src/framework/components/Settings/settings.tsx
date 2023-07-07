import React from "react";

import { Drawer, useGuiSelector } from "@framework/GuiState";
import { Workbench } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/hooks/workbenchHooks";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

import { Setting } from "./private-components/setting";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleId = useActiveModuleId(props.workbench);

    const syncSettingsActive = useGuiSelector((state) => state.openedDrawer === Drawer.SYNC_SETTINGS);

    return (
        <div className={resolveClassNames("bg-white", "p-4", { hidden: syncSettingsActive })}>
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

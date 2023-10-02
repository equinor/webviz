import React from "react";

import { DrawerContent, GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Settings as SettingsIcon } from "@mui/icons-material";

import { ColorPaletteSettings } from "./private-components/colorPaletteSettings";
import { ModulesList } from "./private-components/modulesList";
import { Setting } from "./private-components/setting";
import { SyncSettings } from "./private-components/syncSettings";
import { TemplatesList } from "./private-components/templatesList";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.DrawerContent);

    const mainRef = React.useRef<HTMLDivElement>(null);

    return (
        <div
            ref={mainRef}
            className={resolveClassNames("bg-white", "h-full")}
            style={{ boxShadow: "4px 0px 4px 1px rgba(0, 0, 0, 0.05)" }}
        >
            <ModulesList relContainer={mainRef.current} workbench={props.workbench} />
            <TemplatesList workbench={props.workbench} />
            <SyncSettings workbench={props.workbench} />
            <ColorPaletteSettings workbench={props.workbench} />
            <div
                className={resolveClassNames(
                    drawerContent === DrawerContent.ModuleSettings ? "visible" : "invisible",
                    "h-full",
                    "w-full"
                )}
            >
                {moduleInstances.map((instance) => (
                    <Setting
                        key={instance.getId()}
                        moduleInstance={instance}
                        activeModuleInstanceId={activeModuleInstanceId}
                        workbench={props.workbench}
                    />
                ))}
                {moduleInstances.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <SettingsIcon fontSize="large" className="text-slate-200" />
                    </div>
                )}
            </div>
        </div>
    );
};

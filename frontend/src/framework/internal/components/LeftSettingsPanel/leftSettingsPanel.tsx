import React from "react";

import { GuiState, LeftDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Settings as SettingsIcon } from "@mui/icons-material";

import { ColorPaletteSettings } from "./private-components/colorPaletteSettings";
import { ModuleSettings } from "./private-components/moduleSettings";
import { ModulesList } from "./private-components/modulesList";
import { SyncSettings } from "./private-components/syncSettings";
import { TemplatesList } from "./private-components/templatesList";

type LeftSettingsPanelProps = {
    workbench: Workbench;
};

export const LeftSettingsPanel: React.FC<LeftSettingsPanelProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.LeftDrawerContent);

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
                    drawerContent === LeftDrawerContent.ModuleSettings ? "block" : "hidden",
                    "h-full",
                    "w-full"
                )}
            >
                {moduleInstances.map((instance) => (
                    <ModuleSettings
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

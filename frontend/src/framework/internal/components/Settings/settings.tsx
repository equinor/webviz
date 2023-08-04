import React from "react";

import { useStoreValue } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { useActiveModuleId, useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { Cog6ToothIcon } from "@heroicons/react/20/solid";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

import { ModulesList } from "./private-components/modulesList";
import { Setting } from "./private-components/setting";
import { SyncSettings } from "./private-components/syncSettings";
import { TemplatesList } from "./private-components/templatesList";

import { ColorPaletteSettings } from "../ColorPaletteSettings";

type SettingsProps = {
    workbench: Workbench;
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const moduleInstances = useModuleInstances(props.workbench);
    const activeModuleId = useActiveModuleId(props.workbench);

    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");

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
                        activeModuleId={activeModuleId}
                        workbench={props.workbench}
                    />
                ))}
                {moduleInstances.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Cog6ToothIcon className="w-20 h-20 text-slate-200" />
                    </div>
                )}
            </div>
        </div>
    );
};

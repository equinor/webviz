import React from "react";

import { SyncSettings, SyncSettingsMeta } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { XMarkIcon } from "@heroicons/react/20/solid";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const [syncedSettings, setSyncedSettings] = React.useState<SyncSettings[]>(
        props.moduleInstance.getSyncedSettings()
    );

    React.useEffect(() => {
        function handleSyncedSettingsChange(newSyncedSettings: SyncSettings[]) {
            setSyncedSettings(newSyncedSettings);
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToSyncedSettingsChange(handleSyncedSettingsChange);

        return unsubscribeFunc;
    }, []);

    console.log(syncedSettings);

    return (
        <div
            className={`bg-slate-100 p-4 flex select-none ${props.isDragged ? "cursor-grabbing" : "cursor-move"}`}
            onPointerDown={props.onPointerDown}
        >
            <div className="flex-grow">
                {props.moduleInstance.getName()}
                <>
                    {syncedSettings.map((setting) => (
                        <span key={setting} className="rounded p-2 bg-indigo-700 text-white ml-2 text-xs">
                            {SyncSettingsMeta[setting].abbreviation}
                        </span>
                    ))}
                </>
            </div>

            <div
                className="hover:text-slate-500 cursor-pointer"
                onPointerDown={props.onRemoveClick}
                title="Remove this module"
            >
                <XMarkIcon width={24} />
            </div>
        </div>
    );
};

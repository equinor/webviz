import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { isDevMode } from "@lib/utils/devMode";
import { Close, Error, Warning } from "@mui/icons-material";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const [syncedSettings, setSyncedSettings] = React.useState<SyncSettingKey[]>(
        props.moduleInstance.getSyncedSettingKeys()
    );
    const [title, setTitle] = React.useState<string>(props.moduleInstance.getTitle());

    React.useEffect(() => {
        function handleSyncedSettingsChange(newSyncedSettings: SyncSettingKey[]) {
            setSyncedSettings([...newSyncedSettings]);
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToSyncedSettingKeysChange(handleSyncedSettingsChange);

        return unsubscribeFunc;
    }, []);

    React.useEffect(() => {
        function handleTitleChange(newTitle: string) {
            setTitle(newTitle);
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToTitleChange(handleTitleChange);

        return unsubscribeFunc;
    }, []);

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function makeStateIndicator() {
        if (props.moduleInstance.isLoading()) {
            return (
                <div className="flex items-center justify-center rounded p-1 leading-none bg-indigo-700 text-white ml-2 text-xs mr-2 cursor-help">
                    <CircularProgress size="small" />
                </div>
            );
        }

        if (props.moduleInstance.hasLoggedErrors()) {
            return (
                <div className="flex items-center justify-center rounded p-1 leading-none bg-red-700 text-white ml-2 text-xs mr-2 cursor-help">
                    <Error fontSize="small" />
                </div>
            );
        }

        if (props.moduleInstance.hasLoggedWarnings()) {
            return (
                <div className="flex items-center justify-center rounded p-1 leading-none bg-orange-700 text-white ml-2 text-xs mr-2 cursor-help">
                    <Warning fontSize="small" />
                </div>
            );
        }
    }

    return (
        <div
            className={`bg-slate-100 p-2 pl-4 pr-4 flex items-center select-none shadow ${
                props.isDragged ? "cursor-grabbing" : "cursor-move"
            }`}
            onPointerDown={props.onPointerDown}
        >
            <div className="flex-grow flex items-center text-sm font-bold min-w-0">
                {makeStateIndicator()}
                <span title={title} className="flex-grow text-ellipsis whitespace-nowrap overflow-hidden min-w-0">
                    {title}
                </span>
                {isDevMode() && (
                    <span
                        title={props.moduleInstance.getId()}
                        className="font-light ml-4 mr-4 text-ellipsis whitespace-nowrap overflow-hidden min-w-0"
                    >
                        {props.moduleInstance.getId()}
                    </span>
                )}
                <>
                    {syncedSettings.map((setting) => (
                        <span
                            key={setting}
                            className="flex items-center justify-center rounded p-1 leading-none bg-indigo-700 text-white ml-2 text-xs mr-2 cursor-help"
                            title={`This module syncs its "${SyncSettingsMeta[setting].name}" setting on the current page.`}
                        >
                            {SyncSettingsMeta[setting].abbreviation}
                        </span>
                    ))}
                </>
            </div>

            <div
                className="hover:text-slate-500 cursor-pointer"
                onPointerDown={props.onRemoveClick}
                onPointerUp={handlePointerUp}
                title="Remove this module"
            >
                <Close className="w-4 h-4" />
            </div>
        </div>
    );
};

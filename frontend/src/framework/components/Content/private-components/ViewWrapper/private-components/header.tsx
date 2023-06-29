import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { isDevMode } from "@framework/utils/devMode";
import { pointerEventToPoint } from "@framework/utils/geometry";
import { ShareIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { DataChannelEventTypes } from "../../DataChannelVisualization/dataChannelVisualization";

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

    function handleDataChannelOriginPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        document.dispatchEvent(
            new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN, {
                detail: {
                    moduleInstanceId: props.moduleInstance.getId(),
                    pointerPoint: pointerEventToPoint(e.nativeEvent),
                },
            })
        );
        e.stopPropagation();
        e.preventDefault();
    }

    return (
        <div
            className={`bg-slate-100 p-2 pl-4 pr-4 flex items-center select-none ${
                props.isDragged ? "cursor-grabbing" : "cursor-move"
            }`}
            onPointerDown={props.onPointerDown}
        >
            <div className="flex-grow flex items-center text-sm font-bold min-w-0">
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
                        <span key={setting} className="flex rounded p-2 bg-indigo-700 text-white ml-2 text-xs">
                            {SyncSettingsMeta[setting].abbreviation}
                        </span>
                    ))}
                </>
            </div>
            {props.moduleInstance.hasBroadcastChannels() && (
                <div
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    className="hover:text-slate-500 cursor-grab mr-2"
                    title="Connect data channels"
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <ShareIcon className="w-4 h-4" />
                </div>
            )}
            <div
                className="hover:text-slate-500 cursor-pointer"
                onPointerDown={props.onRemoveClick}
                title="Remove this module"
            >
                <XMarkIcon className="w-4 h-4" />
            </div>
        </div>
    );
};

import React from "react";

import { GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { isDevMode } from "@lib/utils/devMode";
import { ArrowDownward, ArrowUpward, Close } from "@mui/icons-material";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    onInputChannelsClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    guiMessageBroker: GuiMessageBroker;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const dataChannelOriginRef = React.useRef<HTMLDivElement>(null);
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
        if (!dataChannelOriginRef.current) {
            return;
        }
        props.guiMessageBroker.publishEvent(GuiEvent.DataChannelOriginPointerDown, {
            moduleInstanceId: props.moduleInstance.getId(),
            originElement: dataChannelOriginRef.current,
        });
        e.stopPropagation();
        e.preventDefault();
    }

    function handleInputChannelsPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        props.onInputChannelsClick(e);
    }

    function handleInputChannelsPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    return (
        <div
            className={`bg-slate-100 p-2 pl-4 pr-4 flex items-center select-none shadow ${
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
            {props.moduleInstance.hasBroadcastChannels() && (
                <div
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    className="hover:text-slate-500 cursor-grab mr-2"
                    title="Connect data channels to other module instances"
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <ArrowUpward fontSize="small" />
                </div>
            )}
            {props.moduleInstance.getInputChannelDefs().length > 0 && (
                <div
                    className="hover:text-slate-500 cursor-pointer mr-2"
                    title="Edit input data channels"
                    onPointerUp={handleInputChannelsPointerUp}
                    onPointerDown={handleInputChannelsPointerDown}
                >
                    <ArrowDownward fontSize="small" />
                </div>
            )}
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

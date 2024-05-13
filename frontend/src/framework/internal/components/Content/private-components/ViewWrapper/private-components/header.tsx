import React from "react";

import { GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, Error, Input, Output, Warning } from "@mui/icons-material";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any, any, any, any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    onReceiversClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    guiMessageBroker: GuiMessageBroker;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const dataChannelOriginRef = React.useRef<HTMLDivElement>(null);
    const [syncedSettings, setSyncedSettings] = React.useState<SyncSettingKey[]>(
        props.moduleInstance.getSyncedSettingKeys()
    );
    const [title, setTitle] = React.useState<string>(props.moduleInstance.getTitle());
    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");
    const statusMessages = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "messages");
    const [statusMessagesVisible, setStatusMessagesVisible] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(
        function handleMount() {
            function handleSyncedSettingsChange(newSyncedSettings: SyncSettingKey[]) {
                setSyncedSettings([...newSyncedSettings]);
            }

            function handleTitleChange(newTitle: string) {
                setTitle(newTitle);
            }

            const unsubscribeFromSyncSettingsChange =
                props.moduleInstance.subscribeToSyncedSettingKeysChange(handleSyncedSettingsChange);
            const unsubscribeFromTitleChange = props.moduleInstance.subscribeToTitleChange(handleTitleChange);

            return function handleUnmount() {
                unsubscribeFromSyncSettingsChange();
                unsubscribeFromTitleChange();
            };
        },
        [props.moduleInstance]
    );

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        props.onPointerDown(e);
        setStatusMessagesVisible(false);
    }

    function handleDataChannelOriginPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if (!dataChannelOriginRef.current) {
            return;
        }
        props.guiMessageBroker.publishEvent(GuiEvent.DataChannelOriginPointerDown, {
            moduleInstanceId: props.moduleInstance.getId(),
            originElement: dataChannelOriginRef.current,
        });
        e.preventDefault();
        e.stopPropagation();
    }

    function handleReceiversPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        props.onReceiversClick(e);
    }

    function handleReceiverPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function handleStatusPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        setStatusMessagesVisible(!statusMessagesVisible);
        e.stopPropagation();
    }

    function makeStatusIndicator(): React.ReactNode {
        const stateIndicators: React.ReactNode[] = [];

        if (isLoading) {
            stateIndicators.push(
                <div
                    key="header-loading"
                    className="flex items-center justify-center h-full p-1 cursor-help"
                    title="This module is currently loading new content."
                >
                    <CircularProgress size="medium-small" />
                </div>
            );
        }
        const numErrors = statusMessages.filter((message) => message.type === StatusMessageType.Error).length;
        const numWarnings = statusMessages.filter((message) => message.type === StatusMessageType.Warning).length;

        if (numErrors > 0 || numWarnings > 0) {
            stateIndicators.push(
                <div
                    key="header-status-messages"
                    className={resolveClassNames(
                        "flex items-center justify-center cursor-pointer h-full p-1 hover:bg-blue-100",
                        { "bg-blue-300 hover:bg-blue-400": statusMessagesVisible }
                    )}
                    onPointerDown={handleStatusPointerDown}
                >
                    <Badge badgeContent={numErrors + numWarnings} className="flex">
                        <Error
                            fontSize="medium"
                            color="error"
                            style={{ display: numErrors === 0 ? "none" : "block" }}
                        />
                        <div className="overflow-hidden h-full">
                            <Warning
                                fontSize="medium"
                                color="warning"
                                style={{ display: numWarnings === 0 ? "none" : "block" }}
                                className={resolveClassNames({
                                    "-ml-3": numErrors > 0,
                                })}
                            />
                        </div>
                    </Badge>
                </div>
            );
        }

        if (stateIndicators.length === 0) return null;

        return (
            <div className="h-full flex items-center justify-center">
                <span className="bg-slate-300 w-[1px] h-3/4 mx-2" />
                {stateIndicators}
            </div>
        );
    }

    function makeStatusMessages(): React.ReactNode {
        return (
            <div className="flex flex-col p-2 gap-2">
                {statusMessages.map((entry, i) => (
                    <div key={`${entry.message}-${i}`} className="flex items-center gap-2">
                        {entry.type === StatusMessageType.Error && <Error fontSize="small" color="error" />}
                        {entry.type === StatusMessageType.Warning && <Warning fontSize="small" color="warning" />}
                        <span
                            className="ml-2 overflow-hidden text-ellipsis min-w-0 whitespace-nowrap"
                            title={entry.message}
                        >
                            {entry.message}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    const hasErrors = statusMessages.some((entry) => entry.type === StatusMessageType.Error);

    return (
        <div
            className={resolveClassNames("flex items-center select-none shadow relative touch-none", {
                "cursor-grabbing": props.isDragged,
                "cursor-move": !props.isDragged,
                "bg-red-100": hasErrors,
                "bg-slate-100": !hasErrors,
            })}
            onPointerDown={handlePointerDown}
            ref={ref}
        >
            <div
                className={resolveClassNames("absolute -bottom-0.5 left-0 w-full overflow-hidden", {
                    hidden: !isLoading,
                })}
            >
                <div className="bg-blue-600 animate-linear-indefinite h-0.5 w-full rounded" />
            </div>
            <div className="flex-grow flex items-center text-sm font-bold min-w-0 p-2">
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
            {makeStatusIndicator()}
            {(props.moduleInstance.getChannelManager().getReceivers().length > 0 ||
                props.moduleInstance.getChannelManager().getChannels().length > 0) && (
                <span className="bg-slate-300 w-[1px] h-3/4 ml-2" />
            )}
            {props.moduleInstance.getChannelManager().getChannels().length > 0 && (
                <div
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    className="hover:text-slate-500 cursor-grab ml-2 touch-none"
                    title="Connect data channels to other module instances"
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <Output fontSize="small" />
                </div>
            )}
            {props.moduleInstance.getChannelManager().getReceivers().length > 0 && (
                <div
                    className="hover:text-slate-500 cursor-pointer ml-2"
                    title="Edit input data channels"
                    onPointerUp={handleReceiversPointerUp}
                    onPointerDown={handleReceiverPointerDown}
                >
                    <Input fontSize="small" />
                </div>
            )}
            <span className="bg-slate-300 w-[1px] h-3/4 ml-2" />
            <div
                className="hover:text-slate-500 cursor-pointer p-1"
                onPointerDown={props.onRemoveClick}
                onPointerUp={handlePointerUp}
                title="Remove this module"
            >
                <Close className="w-4 h-4" />
            </div>
            {statusMessagesVisible &&
                createPortal(
                    <div
                        className={"absolute shadow min-w-[200px] z-40 bg-white overflow-hidden"}
                        style={{
                            top: boundingRect.bottom,
                            right: window.innerWidth - boundingRect.right,
                            maxWidth: boundingRect.width,
                        }}
                    >
                        {makeStatusMessages()}
                    </div>
                )}
        </div>
    );
};

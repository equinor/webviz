import React from "react";

import {
    GuiEvent,
    GuiMessageBroker,
    GuiState,
    LeftDrawerContent,
    RightDrawerContent,
    useGuiState,
} from "@framework/GuiMessageBroker";
import { ModuleInstance, ModuleInstanceTopic, useModuleInstanceTopicValue } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, Error, History, Input, Output, Warning } from "@mui/icons-material";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    onReceiversClick: (event: React.PointerEvent<HTMLDivElement>) => void;
    guiMessageBroker: GuiMessageBroker;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const dataChannelOriginRef = React.useRef<HTMLDivElement>(null);
    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");
    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache"
    );
    const log = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "log");
    const [, setRightDrawerContent] = useGuiState(props.guiMessageBroker, GuiState.RightDrawerContent);
    const [, setActiveModuleInstanceId] = useGuiState(props.guiMessageBroker, GuiState.ActiveModuleInstanceId);
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        props.guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent
    );
    const [statusMessagesVisible, setStatusMessagesVisible] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingRect = useElementBoundingRect(ref);

    const syncedSettings = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.SYNCED_SETTINGS);
    const title = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.TITLE);

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if (statusMessagesVisible) {
            setStatusMessagesVisible(false);
            return;
        }
        props.onPointerDown(e);
    }

    function handleDoubleClick(e: React.PointerEvent<HTMLDivElement>) {
        setStatusMessagesVisible(false);
        props.guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        e.preventDefault();
        e.stopPropagation();
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

    function handleShowLogClick(e: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();

        if (rightSettingsPanelWidth <= 5) {
            setRightSettingsPanelWidth(15);
        }

        setActiveModuleInstanceId(props.moduleInstance.getId());
        setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);

        setStatusMessagesVisible(false);
    }

    function makeStatusIndicator(): React.ReactNode {
        const stateIndicators: React.ReactNode[] = [];

        if (isLoading) {
            stateIndicators.push(
                <div
                    key="header-loading"
                    className="flex items-center justify-center px-1 cursor-help"
                    title="This module is currently loading new content."
                >
                    <CircularProgress size="medium-small" />
                </div>
            );
        }
        const numErrors = hotStatusMessages.filter((message) => message.type === StatusMessageType.Error).length;
        const numWarnings = hotStatusMessages.filter((message) => message.type === StatusMessageType.Warning).length;

        let badgeTitle = "";
        if (numErrors > 0) {
            badgeTitle += `${numErrors} error${numErrors > 1 ? "s" : ""}`;
        }

        if (numWarnings > 0) {
            badgeTitle += `${badgeTitle.length > 0 ? ", " : ""}${numWarnings} warning${numWarnings > 1 ? "s" : ""}`;
        }

        if (numErrors > 0 || numWarnings > 0) {
            stateIndicators.push(
                <div
                    key="header-status-messages"
                    className={resolveClassNames(
                        "flex items-center justify-center cursor-pointer px-1 hover:bg-blue-100",
                        { "bg-blue-300 hover:bg-blue-400": statusMessagesVisible }
                    )}
                    onPointerDown={handleStatusPointerDown}
                >
                    <Badge badgeContent={numErrors + numWarnings} className="flex p-0.5" title={badgeTitle}>
                        <Error
                            fontSize="inherit"
                            color="error"
                            style={{ display: numErrors === 0 ? "none" : "block" }}
                        />
                        <div className="overflow-hidden">
                            <Warning
                                fontSize="inherit"
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

        if (stateIndicators.length === 0) {
            stateIndicators.push(
                <div
                    key="header-module-log"
                    className="cursor-pointer px-1 hover:text-slate-500"
                    onPointerDown={handleShowLogClick}
                    title="Show complete log for this module"
                >
                    <History fontSize="inherit" />
                </div>
            );
        }

        return (
            <div className="h-full flex items-center justify-center">
                <span className="bg-slate-300 w-[1px] h-1/2 mx-0.5" />
                {stateIndicators}
            </div>
        );
    }

    function makeHotStatusMessages(): React.ReactNode {
        return (
            <div className="flex flex-col p-2 gap-2">
                {hotStatusMessages.map((entry, i) => (
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

    const hasErrors = hotStatusMessages.some((entry) => entry.type === StatusMessageType.Error);

    return (
        <div
            className={resolveClassNames("flex items-center select-none shadow relative touch-none text-lg", {
                "cursor-grabbing": props.isDragged,
                "cursor-move": !props.isDragged,
                "bg-red-100": hasErrors,
                "bg-slate-100": !hasErrors,
            })}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            ref={ref}
        >
            <div
                className={resolveClassNames("absolute -bottom-0.5 left-0 w-full overflow-hidden", {
                    hidden: !isLoading,
                })}
            >
                <div className="bg-blue-600 animate-linear-indefinite h-0.5 w-full rounded" />
            </div>
            <div className="flex-grow flex items-center text-sm font-bold min-w-0 p-1.5">
                <span title={title} className="flex-grow text-ellipsis whitespace-nowrap overflow-hidden min-w-0">
                    {title}
                </span>
                {isDevMode() && (
                    <span
                        title={props.moduleInstance.getId()}
                        className="font-light ml-2 mr-1 text-ellipsis whitespace-nowrap overflow-hidden min-w-0"
                    >
                        {props.moduleInstance.getId()}
                    </span>
                )}
                <>
                    {syncedSettings.map((setting) => (
                        <span
                            key={setting}
                            className="flex items-center justify-center rounded p-1 leading-none bg-indigo-700 text-white ml-1 text-xs mr-1 cursor-help"
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
                <span className="bg-slate-300 w-[1px] h-1/2 ml-1" />
            )}
            {props.moduleInstance.getChannelManager().getChannels().length > 0 && (
                <div
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    className="hover:text-slate-500 cursor-grab ml-1 touch-none"
                    title="Connect data channels to other module instances"
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <Output fontSize="inherit" />
                </div>
            )}
            {props.moduleInstance.getChannelManager().getReceivers().length > 0 && (
                <div
                    className="hover:text-slate-500 cursor-pointer ml-1"
                    title="Edit input data channels"
                    onPointerUp={handleReceiversPointerUp}
                    onPointerDown={handleReceiverPointerDown}
                >
                    <Input fontSize="inherit" />
                </div>
            )}
            <span className="bg-slate-300 w-[1px] h-1/2 ml-1" />
            <div
                className="hover:text-slate-500 cursor-pointer px-1"
                onPointerDown={props.onRemoveClick}
                onPointerUp={handlePointerUp}
                title="Remove this module"
            >
                <Close fontSize="inherit" />
            </div>
            {statusMessagesVisible &&
                createPortal(
                    <div
                        className={"absolute shadow min-w-[200px] z-40 bg-white overflow-hidden text-sm"}
                        style={{
                            top: boundingRect.bottom,
                            right: window.innerWidth - boundingRect.right,
                            maxWidth: boundingRect.width,
                        }}
                    >
                        {makeHotStatusMessages()}
                        {log.length > 0 && (
                            <>
                                <div className="bg-gray-300 h-0.5 w-full my-1" />
                                <Button variant="text" onPointerDown={handleShowLogClick} className="w-full">
                                    <>
                                        <History fontSize="inherit" /> Show complete log
                                    </>
                                </Button>
                            </>
                        )}
                    </div>
                )}
        </div>
    );
};

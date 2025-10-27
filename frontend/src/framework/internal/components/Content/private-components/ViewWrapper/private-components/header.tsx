import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { Close, CloseFullscreen, Error, History, Input, OpenInFull, Output, Warning } from "@mui/icons-material";

import {
    GuiEvent,
    GuiState,
    LeftDrawerContent,
    RightDrawerContent,
    useGuiState,
    useGuiValue,
} from "@framework/GuiMessageBroker";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleInstanceTopic, useModuleInstanceTopicValue } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { MenuText } from "@lib/components/MenuText/menuText";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type HeaderProps = {
    workbench: Workbench;
    isMaximized?: boolean;
    isMinimized?: boolean;
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onReceiversClick?: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const moduleInstanceId = props.moduleInstance.getId();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelOriginRef = React.useRef<HTMLButtonElement>(null);
    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");
    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache",
    );
    const devToolsVisible = useGuiValue(guiMessageBroker, GuiState.DevToolsVisible);

    const handleMaximizeClick = React.useCallback(
        function handleMaximizeClick(e: React.PointerEvent<HTMLButtonElement>) {
            const currentLayout = dashboard.getLayout();
            const tweakedLayout = currentLayout.map((l) => ({
                ...l,
                maximized: l.moduleInstanceId === moduleInstanceId,
            }));
            dashboard.setLayout(tweakedLayout);
            dashboard.setActiveModuleInstanceId(moduleInstanceId);

            e.preventDefault();
            e.stopPropagation();
        },
        [moduleInstanceId, dashboard],
    );

    const handleRestoreClick = React.useCallback(
        function handleRestoreClick(e: React.PointerEvent<HTMLButtonElement>) {
            const currentLayout = dashboard.getLayout();
            const tweakedLayout = currentLayout.map((l) => ({ ...l, maximized: false }));
            dashboard.setLayout(tweakedLayout);

            e.preventDefault();
            e.stopPropagation();
        },
        [dashboard],
    );

    const handleRemoveClick = React.useCallback(
        function handleRemoveClick(e: React.PointerEvent<HTMLButtonElement>) {
            guiMessageBroker.publishEvent(GuiEvent.RemoveModuleInstanceRequest, { moduleInstanceId: moduleInstanceId });

            e.preventDefault();
            e.stopPropagation();
        },
        [guiMessageBroker, moduleInstanceId],
    );

    const syncedSettings = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.SYNCED_SETTINGS);
    const title = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.TITLE);

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        props.onPointerDown?.(e);
    }

    function handleDoubleClick(e: React.PointerEvent<HTMLDivElement>) {
        guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDataChannelOriginPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        if (!dataChannelOriginRef.current) {
            return;
        }
        guiMessageBroker.publishEvent(GuiEvent.DataChannelOriginPointerDown, {
            moduleInstanceId: props.moduleInstance.getId(),
            originElement: dataChannelOriginRef.current,
        });
        e.preventDefault();
        e.stopPropagation();
    }

    function handleReceiversPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        props.onReceiversClick?.(e);
    }

    function handleReceiverPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
    }

    const hasErrors = hotStatusMessages.some((entry) => entry.type === StatusMessageType.Error);
    const hasDataChannel = props.moduleInstance.getChannelManager().getChannels().length > 0;
    const hasDataReceiver = props.moduleInstance.getChannelManager().getReceivers().length > 0;
    const showDataChannelButtons = !props.isMinimized && !props.isMaximized && (hasDataChannel || hasDataReceiver);

    return (
        <div
            className={resolveClassNames(
                "flex items-center gap-0.5 px-1 select-none shadow-sm relative touch-none text-lg",
                {
                    "cursor-grabbing": props.isDragged,
                    "cursor-move": !props.isDragged,
                    "bg-red-100": hasErrors,
                    "bg-slate-300": !hasErrors && props.isMinimized,
                    "bg-slate-100": !hasErrors && !props.isMinimized,
                },
            )}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
        >
            <div
                className={resolveClassNames("absolute -bottom-0.5 left-0 w-full overflow-hidden", {
                    hidden: !isLoading,
                })}
            >
                <div className="bg-blue-600 animate-linear-indefinite h-0.5 w-full rounded-sm" />
            </div>
            <div className="grow flex items-center text-sm font-bold min-w-0 p-1.5">
                <Tooltip title={title}>
                    <span className="grow text-ellipsis whitespace-nowrap overflow-hidden min-w-0">{title}</span>
                </Tooltip>
                {devToolsVisible && (
                    <span
                        title={props.moduleInstance.getId()}
                        className="font-light text-xs ml-2 mr-1 text-ellipsis whitespace-nowrap overflow-hidden min-w-0"
                    >
                        {props.moduleInstance.getId()}
                    </span>
                )}
                <>
                    {syncedSettings.map((setting) => (
                        <Tooltip
                            title={`This module syncs its "${SyncSettingsMeta[setting].name}" setting on the current page.`}
                            key={setting}
                        >
                            <span className="flex items-center justify-center rounded-sm p-1 leading-none bg-indigo-700 text-white ml-1 text-xs mr-1 cursor-help">
                                {SyncSettingsMeta[setting].abbreviation}
                            </span>
                        </Tooltip>
                    ))}
                </>
            </div>
            <StatusIndicator
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={props.isMinimized}
            />
            {showDataChannelButtons && <HeaderSeparator />}
            {showDataChannelButtons && hasDataChannel && (
                <DenseIconButton
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    className="cursor-grab touch-none"
                    title="Connect data channels to other module instances"
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <Output fontSize="inherit" />
                </DenseIconButton>
            )}
            {showDataChannelButtons && hasDataReceiver && (
                <DenseIconButton
                    title="Edit input data channels"
                    onPointerUp={handleReceiversPointerUp}
                    onPointerDown={handleReceiverPointerDown}
                >
                    <Input fontSize="inherit" />
                </DenseIconButton>
            )}
            <HeaderSeparator />
            {props.isMaximized ? (
                <DenseIconButton onPointerDown={handleRestoreClick} onPointerUp={handlePointerUp} title="Restore">
                    <CloseFullscreen fontSize="inherit" />
                </DenseIconButton>
            ) : (
                <DenseIconButton onPointerDown={handleMaximizeClick} onPointerUp={handlePointerUp} title="Maximize">
                    <OpenInFull fontSize="inherit" />
                </DenseIconButton>
            )}
            <DenseIconButton
                onPointerDown={handleRemoveClick}
                onPointerUp={handlePointerUp}
                title="Remove this module"
                colorScheme={DenseIconButtonColorScheme.DANGER}
            >
                <Close fontSize="inherit" />
            </DenseIconButton>
        </div>
    );
};

type StatusIndicatorProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any>;
    isMinimized?: boolean;
};

function StatusIndicator(props: StatusIndicatorProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );

    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");
    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache",
    );
    const log = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "log");
    const [, setRightDrawerContent] = useGuiState(guiMessageBroker, GuiState.RightDrawerContent);
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );

    function handleShowLogClick(e: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();

        if (rightSettingsPanelWidth <= 5) {
            setRightSettingsPanelWidth(15);
        }

        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    function makeHotStatusMessages(): React.ReactNode {
        return (
            <div className="flex flex-col p-2 gap-2">
                {hotStatusMessages.map((entry, i) => (
                    <MenuText key={`${entry.message}-${i}`}>
                        {entry.type === StatusMessageType.Error && <Error fontSize="inherit" color="error" />}
                        {entry.type === StatusMessageType.Warning && <Warning fontSize="inherit" color="warning" />}
                        <span
                            className="ml-2 overflow-hidden text-ellipsis min-w-0 whitespace-nowrap"
                            title={entry.message}
                        >
                            {entry.message}
                        </span>
                    </MenuText>
                ))}
            </div>
        );
    }

    const stateIndicators: React.ReactNode[] = [];

    if (isLoading) {
        stateIndicators.push(
            <Tooltip key="header-loading" title="This module is currently loading new content.">
                <div className="flex items-center justify-center px-1 cursor-help">
                    <CircularProgress size="small" />
                </div>
            </Tooltip>,
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
            <Dropdown key="header-status-messages">
                <Tooltip title="Show status messages" placement="bottom">
                    <MenuButton className="flex items-center rounded-sm justify-center p-1 hover:bg-blue-200 text-sm">
                        <Badge
                            badgeContent={numErrors + numWarnings}
                            className="flex p-0.5"
                            invisible={props.isMinimized}
                            title={badgeTitle}
                        >
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
                    </MenuButton>
                </Tooltip>
                <Menu anchorOrigin="bottom-end">
                    {makeHotStatusMessages()}
                    {log.length > 0 && (
                        <>
                            <div className="bg-gray-300 h-0.5 w-full my-1" />
                            <MenuItem onClick={handleShowLogClick} className="text-sm">
                                <History fontSize="inherit" /> Show complete log
                            </MenuItem>
                        </>
                    )}
                </Menu>
            </Dropdown>,
        );
    }

    if (stateIndicators.length === 0) {
        stateIndicators.push(
            <DenseIconButton
                key="header-module-log"
                onPointerDown={handleShowLogClick}
                title="Show complete log for this module"
            >
                <History fontSize="inherit" />
            </DenseIconButton>,
        );
    }

    return (
        <>
            <div className="h-full flex items-center justify-center">
                <HeaderSeparator />
                {stateIndicators}
            </div>
        </>
    );
}

function HeaderSeparator(): React.ReactNode {
    return <div className="bg-slate-300 w-px h-1/2 mx-1" />;
}

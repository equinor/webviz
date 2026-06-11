import React from "react";

import type { BaseUIEvent, PopoverRootActions } from "@base-ui/react";
import { Close, CloseFullscreen, Error, History, Input, OpenInFull, Output, Warning } from "@mui/icons-material";

import {
    GuiEvent,
    GuiState,
    RightDrawerContent,
    useGuiState,
    useGuiValue,
    useSetGuiState,
} from "@framework/GuiMessageBroker";
import { useActiveDashboard } from "@framework/internal/components/ActiveDashboardBoundary";
import {
    SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT,
    SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT,
} from "@framework/internal/components/SettingsContentPanels";
import { ChannelManagerNotificationTopic } from "@framework/internal/DataChannels/ChannelManager";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleInstanceTopic, useModuleInstanceTopicValue } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { SyncSettingsMeta } from "@framework/SyncSettings";
import type { Workbench } from "@framework/Workbench";
import { Tooltip } from "@lib/components/Tooltip";
import { Badge } from "@lib/newComponents/Badge";
import { Button } from "@lib/newComponents/Button";
import { LinearProgress } from "@lib/newComponents/LinearProgress";
import { Popover } from "@lib/newComponents/Popover";
import { Separator } from "@lib/newComponents/Separator";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { CircularProgress } from "@lib/newComponents/CircularProgress";

export type HeaderProps = {
    workbench: Workbench;
    isMaximized?: boolean;
    isMinimized?: boolean;
    moduleInstance: ModuleInstance<any, any>;
    isDragged: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const dashboard = useActiveDashboard();
    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getActiveSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );
    const moduleInstanceId = props.moduleInstance.getId();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache",
    );

    const persistedSettingsInvalid = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.HAS_INVALID_PERSISTED_SETTINGS,
    );
    const persistedViewInvalid = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.HAS_INVALID_PERSISTED_VIEW,
    );

    const invalidPersistedState = persistedSettingsInvalid || persistedViewInvalid;

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
            if (isSnapshot) {
                return;
            }
            guiMessageBroker.publishEvent(GuiEvent.RemoveModuleInstanceRequest, { moduleInstanceId: moduleInstanceId });

            e.preventDefault();
            e.stopPropagation();
        },
        [isSnapshot, guiMessageBroker, moduleInstanceId],
    );

    function handleDoubleClick(e: React.PointerEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
    }

    const hasErrors = hotStatusMessages.some((entry) => entry.type === StatusMessageType.Error);

    return (
        <div
            className={resolveClassNames(
                "px-xs gap-x-xs shadow-elevation-raised py-4xs relative flex touch-none items-center text-lg select-none",
                {
                    "bg-danger-canvas": hasErrors || invalidPersistedState,
                    "bg-neutral-subtle": !hasErrors && props.isMinimized && !invalidPersistedState,
                    "bg-neutral-canvas": !hasErrors && !props.isMinimized && !invalidPersistedState,
                },
            )}
            onDoubleClick={handleDoubleClick}
        >
            <ModuleLoadingBar moduleInstance={props.moduleInstance} />

            <ModuleTitle
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isDragged={props.isDragged}
                isSnapshotMode={isSnapshot}
                onPointerDown={props.onPointerDown}
            />
            <SyncedSettingsIndicator moduleInstance={props.moduleInstance} />

            <Separator orientation="vertical" />

            <StatusIndicator
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={props.isMinimized}
            />

            <Separator orientation="vertical" />

            <DataChannelButtons
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={props.isMinimized}
                isMaximized={props.isMaximized}
                isSnapshotMode={isSnapshot}
            />

            <Separator orientation="vertical" />

            {props.isMaximized ? (
                <Tooltip title="Restore">
                    <Button
                        onPointerDown={handleRestoreClick}
                        onPointerUp={handlePointerUp}
                        title="Restore"
                        variant="ghost"
                        tone="neutral"
                        size="small"
                        iconOnly
                    >
                        <CloseFullscreen fontSize="inherit" />
                    </Button>
                </Tooltip>
            ) : (
                <Tooltip title="Maximize">
                    <Button
                        onPointerDown={handleMaximizeClick}
                        onPointerUp={handlePointerUp}
                        title="Maximize"
                        variant="ghost"
                        tone="neutral"
                        size="small"
                        iconOnly
                    >
                        <OpenInFull fontSize="inherit" />
                    </Button>
                </Tooltip>
            )}
            <Tooltip title={isSnapshot ? "Cannot remove modules in snapshot mode" : "Remove this module"}>
                <Button
                    onPointerDown={handleRemoveClick}
                    onPointerUp={handlePointerUp}
                    disabled={isSnapshot}
                    tone="danger"
                    variant="ghost"
                    size="small"
                    iconOnly
                >
                    <Close fontSize="inherit" />
                </Button>
            </Tooltip>
        </div>
    );
};

type ModuleLoadingBarProps = {
    moduleInstance: ModuleInstance<any, any>;
};

function ModuleLoadingBar(props: ModuleLoadingBarProps) {
    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");

    return (
        <div
            className={resolveClassNames("absolute -bottom-0.5 left-0 w-full", {
                hidden: !isLoading,
            })}
        >
            <LinearProgress variant="indeterminate" />
        </div>
    );
}

type ModuleTitleProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
    isDragged: boolean;
    isSnapshotMode?: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function ModuleTitle(props: ModuleTitleProps) {
    const title = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.TITLE);
    const devToolsVisible = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.DevToolsVisible);

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if (props.isSnapshotMode) return;

        props.onPointerDown?.(e);
    }

    return (
        <div
            className={resolveClassNames(
                "py-3xs text-body-sm font-bolder gap-x-sm flex min-w-0 grow items-center",
                {
                    "cursor-grabbing": props.isDragged,
                    "cursor-move": !props.isDragged && !props.isSnapshotMode,
                },
            )}
            onPointerDown={handlePointerDown}
        >
            <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap" title={title}>
                {title}
            </span>
            {devToolsVisible && (
                <span
                    title={props.moduleInstance.getId()}
                    className="text-body-xs min-w-0 overflow-hidden font-light text-ellipsis whitespace-nowrap"
                >
                    {props.moduleInstance.getId()}
                </span>
            )}
        </div>
    );
}

type SyncedSettingsIndicatorProps = {
    moduleInstance: ModuleInstance<any, any>;
};

function SyncedSettingsIndicator(props: SyncedSettingsIndicatorProps) {
    const syncedSettings = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.SYNCED_SETTINGS);

    return (
        <div className="gap-x-2xs flex items-center">
            {syncedSettings.map((setting) => (
                <Tooltip
                    title={`This module syncs its "${SyncSettingsMeta[setting].name}" setting in the current dashboard.`}
                    key={setting}
                >
                    <span className="bg-info-strong px-3xs py-3xs text-body-xs text-info-strong-on-emphasis font-bolder flex cursor-help items-center justify-center rounded-sm leading-none">
                        {SyncSettingsMeta[setting].abbreviation}
                    </span>
                </Tooltip>
            ))}
        </div>
    );
}

type DataChannelButtonsProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
    isMinimized?: boolean;
    isMaximized?: boolean;
    isSnapshotMode?: boolean;
};

function DataChannelButtons(props: DataChannelButtonsProps): React.ReactNode {
    const dataChannelOriginRef = React.useRef<HTMLButtonElement>(null);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const channelManager = props.moduleInstance.getChannelManager();

    const channels = usePublishSubscribeTopicValue(channelManager, ChannelManagerNotificationTopic.CHANNELS_CHANGE);
    const receivers = usePublishSubscribeTopicValue(channelManager, ChannelManagerNotificationTopic.RECEIVERS_CHANGE);

    // We can cheaply count connection numbers each render, so we subscribe to the revision number here just to trigger re-renders
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _connectionStateRevision = usePublishSubscribeTopicValue(
        channelManager,
        ChannelManagerNotificationTopic.CONNECTION_STATE_REVISION,
    );

    const numIncomingConnections = channelManager.getNumberOfIncomingConnections();
    const numOutgoingConnections = channelManager.getNumberOfOutgoingConnections();

    const hasDataChannel = channels.length > 0;
    const hasDataReceiver = receivers.length > 0;
    const showDataChannelButtons = !props.isMinimized && !props.isMaximized && (hasDataChannel || hasDataReceiver);

    function handleDataChannelOriginPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        if (!dataChannelOriginRef.current) return;

        if (props.isSnapshotMode) {
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
        e.stopPropagation();

        guiMessageBroker.setState(GuiState.EditDataChannelConnections, true);
        guiMessageBroker.publishEvent(GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest, {
            moduleInstanceId: props.moduleInstance.getId(),
        });
    }

    function handleReceiverPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
    }

    if (!showDataChannelButtons) return null;

    function makeChannelOutButtonTitle(): string {
        const msg = props.isSnapshotMode
            ? "Cannot change data channels in snapshot mode"
            : "Drag to connect data channels to other modules";

        return appendConnectionCount(msg, numOutgoingConnections);
    }

    function makeChannelInButtonTitle(): string {
        const message = props.isSnapshotMode ? "Show input data channels" : "Edit input data channels";

        return appendConnectionCount(message, numIncomingConnections);
    }

    function appendConnectionCount(title: string, connectionCount: number): string {
        if (connectionCount === 0) return title;

        return `${title} (${connectionCount} active ${connectionCount === 1 ? "connection" : "connections"})`;
    }

    return (
        <>
            {hasDataChannel && (
                <Button
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    layoutClassName="cursor-grab! touch-none"
                    title={makeChannelOutButtonTitle()}
                    disabled={props.isSnapshotMode}
                    onPointerDown={handleDataChannelOriginPointerDown}
                    iconOnly
                    variant="ghost"
                    size="small"
                    tone="neutral"
                >
                    <Badge badgeContent={numOutgoingConnections} invisible={props.isMinimized}>
                        <Output fontSize="inherit" />
                    </Badge>
                </Button>
            )}
            {hasDataReceiver && (
                <Button
                    title={makeChannelInButtonTitle()}
                    onPointerDown={handleReceiverPointerDown}
                    onPointerUp={handleReceiversPointerUp}
                    iconOnly
                    variant="ghost"
                    size="small"
                    tone="neutral"
                >
                    <Badge badgeContent={numIncomingConnections} invisible={props.isMinimized}>
                        <Input fontSize="inherit" />
                    </Badge>
                </Button>
            )}
        </>
    );
}

type StatusIndicatorProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
    isMinimized?: boolean;
};

function StatusIndicator(props: StatusIndicatorProps): React.ReactNode {
    const popoverActionRef = React.useRef<PopoverRootActions | null>(null);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const dashboard = useActiveDashboard();

    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");
    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache",
    );
    const log = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "log");
    const setRightDrawerContent = useSetGuiState(guiMessageBroker, GuiState.RightDrawerContent);
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );

    function handleShowLogClick(e: BaseUIEvent<React.MouseEvent<HTMLButtonElement, MouseEvent>>) {
        e.preventDefault();
        e.stopPropagation();

        if (rightSettingsPanelWidth <= SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT) {
            setRightSettingsPanelWidth(SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT);
        }

        popoverActionRef.current?.close();
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    function makeHotStatusMessages(): React.ReactNode {
        return (
            <ul className="gap-y-2xs px-2xs py-2xs flex flex-col">
                {hotStatusMessages.map((entry, i) => (
                    <li key={`${entry.message}-${i}`} className="px-3xs py-4xs">
                        <Typography
                            as="span"
                            size="xs"
                            title={entry.message}
                            tone="neutral"
                            layoutClassName="gap-x-2xs flex items-center"
                        >
                            {entry.type === StatusMessageType.Error && <Error fontSize="inherit" color="error" />}
                            {entry.type === StatusMessageType.Warning && <Warning fontSize="inherit" color="warning" />}
                            {entry.message}
                        </Typography>
                    </li>
                ))}
            </ul>
        );
    }

    const stateIndicators: React.ReactNode[] = [];

    if (isLoading) {
        stateIndicators.push(
            <Tooltip key="header-loading" title="This module is currently loading new content.">
                <div className="flex cursor-help items-center justify-center px-1">
                    <CircularProgress size={16} />
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
            <Popover.Root key="state-indicator-warning" actionsRef={popoverActionRef}>
                <Popover.Trigger variant="ghost" size="small" iconOnly tone="neutral">
                    <Tooltip title={badgeTitle} placement="bottom">
                        <Badge badgeContent={numErrors + numWarnings} invisible={props.isMinimized}>
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
                    </Tooltip>
                </Popover.Trigger>
                <Popover.Popup side="bottom">
                    <Popover.Content>
                        {makeHotStatusMessages()}
                        {log.length > 0 && (
                            <>
                                <Separator orientation="horizontal" />
                                <Button
                                    variant="ghost"
                                    tone="neutral"
                                    size="small"
                                    onClick={handleShowLogClick}
                                    layoutClassName="w-full"
                                >
                                    <History fontSize="inherit" /> Show complete log
                                </Button>
                            </>
                        )}
                    </Popover.Content>
                </Popover.Popup>
            </Popover.Root>,
        );
    }

    if (stateIndicators.length === 0) {
        stateIndicators.push(
            <Tooltip title="Show complete log for this module" key="header-module-log">
                <Button onPointerDown={handleShowLogClick} variant="ghost" tone="neutral" size="small" iconOnly>
                    <History fontSize="inherit" />
                </Button>
            </Tooltip>,
        );
    }

    return <>{stateIndicators}</>;
}

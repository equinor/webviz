import React from "react";

import type { BaseUIEvent, PopoverRootActions } from "@base-ui/react";
import {
    Close,
    CloseFullscreen,
    Error,
    History,
    Input,
    Link,
    MoreVert,
    OpenInFull,
    Output,
    Warning,
} from "@mui/icons-material";

import {
    GuiEvent,
    GuiState,
    RightDrawerContent,
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
import { useElementSize } from "@lib/hooks/useElementSize";
import { Badge } from "@lib/newComponents/Badge";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { LinearProgress } from "@lib/newComponents/LinearProgress";
import { Menu } from "@lib/newComponents/Menu";
import { Popover } from "@lib/newComponents/Popover";
import { Separator } from "@lib/newComponents/Separator";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type HeaderProps = {
    workbench: Workbench;
    isMaximized?: boolean;
    isMinimized?: boolean;
    moduleInstance: ModuleInstance<any, any>;
    isDragged: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

const COMPACT_WIDTH_THRESHOLD_PX = 240;

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

    const isLoading = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "loading");

    const channelManager = props.moduleInstance.getChannelManager();
    const receivers = usePublishSubscribeTopicValue(channelManager, ChannelManagerNotificationTopic.RECEIVERS_CHANGE);

    const editConnections = React.useCallback(
        function editConnections() {
            guiMessageBroker.setState(GuiState.EditDataChannelConnections, true);
            guiMessageBroker.publishEvent(GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest, {
                moduleInstanceId,
            });
        },
        [guiMessageBroker, moduleInstanceId],
    );

    const setRightSettingsPanelWidth = useSetGuiState(
        guiMessageBroker,
        GuiState.RightSettingsPanelWidthInPercent,
    );
    const setRightDrawerContent = useSetGuiState(guiMessageBroker, GuiState.RightDrawerContent);

    const showLog = React.useCallback(
        function showLog() {
            if (
                guiMessageBroker.getState(GuiState.RightSettingsPanelWidthInPercent) <=
                SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT
            ) {
                setRightSettingsPanelWidth(SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT);
            }
            dashboard.setActiveModuleInstanceId(moduleInstanceId);
            setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);
        },
        [guiMessageBroker, setRightSettingsPanelWidth, dashboard, moduleInstanceId, setRightDrawerContent],
    );

    const headerRef = React.useRef<HTMLDivElement>(null);
    const { width: headerWidth } = useElementSize(headerRef);
    const isCompact = headerWidth < COMPACT_WIDTH_THRESHOLD_PX;

    const maximize = React.useCallback(
        function maximize() {
            const currentLayout = dashboard.getLayout();
            dashboard.setLayout(
                currentLayout.map((l) => ({ ...l, maximized: l.moduleInstanceId === moduleInstanceId })),
            );
            dashboard.setActiveModuleInstanceId(moduleInstanceId);
        },
        [moduleInstanceId, dashboard],
    );

    const restore = React.useCallback(
        function restore() {
            dashboard.setLayout(dashboard.getLayout().map((l) => ({ ...l, maximized: false })));
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
    const numErrors = hotStatusMessages.filter((m) => m.type === StatusMessageType.Error).length;
    const numWarnings = hotStatusMessages.filter((m) => m.type === StatusMessageType.Warning).length;

    const sharedActionProps: HeaderActionsProps = {
        workbench: props.workbench,
        moduleInstance: props.moduleInstance,
        isMaximized: props.isMaximized,
        isMinimized: props.isMinimized,
        isSnapshotMode: isSnapshot,
        onMaximize: maximize,
        onRestore: restore,
    };

    const compactActionProps: CompactHeaderActionsProps = {
        ...sharedActionProps,
        isLoading,
        numErrors,
        numWarnings,
        hasDataReceiver: receivers.length > 0,
        onShowLog: showLog,
        onEditConnections: editConnections,
    };

    return (
        <div
            ref={headerRef}
            className={resolveClassNames(
                "px-xs gap-4xs shadow-elevation-raised py-4xs text-body-lg border-neutral-subtle relative flex touch-none items-center border select-none",
                {
                    "bg-danger-canvas": hasErrors || invalidPersistedState,
                    "bg-neutral-subtle": !hasErrors && props.isMinimized && !invalidPersistedState,
                    "bg-neutral": !hasErrors && !props.isMinimized && !invalidPersistedState,
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

            {!isCompact ? (
                <DefaultHeaderActions {...sharedActionProps} />
            ) : (
                <CompactHeaderActions {...compactActionProps} />
            )}

            <div className="gap-4xs flex shrink-0 items-center">
                <Separator orientation="vertical" />
                <Tooltip content={isSnapshot ? "Cannot remove modules in snapshot mode" : "Remove this module"}>
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
        </div>
    );
};

type HeaderActionsProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
    isMaximized?: boolean;
    isMinimized?: boolean;
    isSnapshotMode?: boolean;
    onMaximize: () => void;
    onRestore: () => void;
};

function DefaultHeaderActions(props: HeaderActionsProps): React.ReactNode {
    function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
    }

    function handleMaximizePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        props.onMaximize();
        e.preventDefault();
        e.stopPropagation();
    }

    function handleRestorePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        props.onRestore();
        e.preventDefault();
        e.stopPropagation();
    }

    return (
        <>
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
                isSnapshotMode={props.isSnapshotMode}
            />
            <div className="gap-4xs flex shrink-0 items-center">
                <Separator orientation="vertical" />
                {props.isMaximized ? (
                    <Tooltip content="Restore">
                        <Button
                            onPointerDown={handleRestorePointerDown}
                            onPointerUp={handlePointerUp}
                            variant="ghost"
                            tone="neutral"
                            size="small"
                            iconOnly
                        >
                            <CloseFullscreen fontSize="inherit" />
                        </Button>
                    </Tooltip>
                ) : (
                    <Tooltip content="Maximize">
                        <Button
                            onPointerDown={handleMaximizePointerDown}
                            onPointerUp={handlePointerUp}
                            variant="ghost"
                            tone="neutral"
                            size="small"
                            iconOnly
                        >
                            <OpenInFull fontSize="inherit" />
                        </Button>
                    </Tooltip>
                )}
            </div>
        </>
    );
}

type CompactHeaderActionsProps = HeaderActionsProps & {
    isLoading: boolean;
    numErrors: number;
    numWarnings: number;
    hasDataReceiver: boolean;
    onShowLog: () => void;
    onEditConnections: () => void;
};

function CompactHeaderActions(props: CompactHeaderActionsProps): React.ReactNode {
    const syncedSettings = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.SYNCED_SETTINGS);

    return (
        <div className="gap-4xs flex shrink-0 items-center">
            <DataChannelButtons
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={false}
                isMaximized={props.isMaximized}
                isSnapshotMode={props.isSnapshotMode}
                showChannelsOnly
            />
            <Separator orientation="vertical" />
            <Menu.Root>
                <Menu.Trigger>
                    <Button variant="ghost" size="small" tone="neutral" iconOnly title="More options">
                        <MoreVert fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
                <Menu.Popup>
                    {syncedSettings.length > 0 && (
                        <Menu.SubmenuItem
                            triggerContent={
                                <Menu.Item
                                    key="synced-settings"
                                    icon={
                                        <Badge badgeContent={syncedSettings.length}>
                                            <Link fontSize="inherit" />
                                        </Badge>
                                    }
                                    text="Synced settings"
                                />
                            }
                        >
                            {syncedSettings.map((setting) => (
                                <Menu.Item
                                    key={setting}
                                    icon={<Link fontSize="inherit" />}
                                    text={`Syncs "${SyncSettingsMeta[setting].name}" across the dashboard`}
                                />
                            ))}
                        </Menu.SubmenuItem>
                    )}
                    {props.isLoading && <Menu.Item icon={<CircularProgress size={16} />} text="Loading..." disabled />}
                    {props.numErrors > 0 && (
                        <Menu.Item
                            icon={<Error fontSize="inherit" color="error" />}
                            text={`${props.numErrors} error${props.numErrors > 1 ? "s" : ""}`}
                            disabled
                        />
                    )}
                    {props.numWarnings > 0 && (
                        <Menu.Item
                            icon={<Warning fontSize="inherit" color="warning" />}
                            text={`${props.numWarnings} warning${props.numWarnings > 1 ? "s" : ""}`}
                            disabled
                        />
                    )}
                    <Menu.Item icon={<History fontSize="inherit" />} text="Show module log" onClick={props.onShowLog} />
                    {props.hasDataReceiver && !props.isSnapshotMode && (
                        <Menu.Item
                            icon={<Input fontSize="inherit" />}
                            text="Edit data connections"
                            onClick={props.onEditConnections}
                        />
                    )}
                    <Menu.Separator />
                    {props.isMaximized ? (
                        <Menu.Item
                            icon={<CloseFullscreen fontSize="inherit" />}
                            text="Restore"
                            onClick={props.onRestore}
                        />
                    ) : (
                        <Menu.Item
                            icon={<OpenInFull fontSize="inherit" />}
                            text="Maximize"
                            onClick={props.onMaximize}
                        />
                    )}
                </Menu.Popup>
            </Menu.Root>
        </div>
    );
}

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
            className={resolveClassNames("py-3xs text-body-sm font-bolder gap-x-sm flex min-w-0 grow items-center", {
                "cursor-grabbing": props.isDragged,
                "cursor-move": !props.isDragged && !props.isSnapshotMode,
            })}
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
                    content={`This module syncs its "${SyncSettingsMeta[setting].name}" setting in the current dashboard.`}
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
    showChannelsOnly?: boolean;
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
            {hasDataReceiver && !props.showChannelsOnly && (
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
    const setRightSettingsPanelWidth = useSetGuiState(guiMessageBroker, GuiState.RightSettingsPanelWidthInPercent);

    function handleShowLogClick(e: BaseUIEvent<React.MouseEvent<HTMLButtonElement, MouseEvent>>) {
        e.preventDefault();
        e.stopPropagation();

        if (guiMessageBroker.getState(GuiState.RightSettingsPanelWidthInPercent) <= SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT) {
            setRightSettingsPanelWidth(SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT);
        }

        popoverActionRef.current?.close();
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    function makeHotStatusMessages(): React.ReactNode {
        return (
            <ul className="gap-y-2xs p-2xs flex flex-col">
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
            <Tooltip key="header-loading" content="This module is currently loading new content.">
                <div className="px-3xs flex cursor-help items-center justify-center">
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
                    <Tooltip content={badgeTitle} side="bottom">
                        <Badge badgeContent={numErrors + numWarnings} invisible={props.isMinimized}>
                            <div className="gap-x-4xs flex items-center whitespace-nowrap">
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
                                            "-ml-xs": numErrors > 0,
                                        })}
                                    />
                                </div>
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
            <Tooltip content="Show complete log for this module" key="header-module-log">
                <Button onPointerDown={handleShowLogClick} variant="ghost" tone="neutral" size="small" iconOnly>
                    <History fontSize="inherit" />
                </Button>
            </Tooltip>,
        );
    }

    return <>{stateIndicators}</>;
}

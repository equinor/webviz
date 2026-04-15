import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
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
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { MenuText } from "@lib/components/MenuText/menuText";
import { Tooltip } from "@lib/components/Tooltip";
import { LinearProgress } from "@lib/newComponents/LinearProgress";
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
                "relative flex touch-none items-center gap-0.5 px-1 text-lg shadow-sm select-none",
                {
                    "bg-red-100": hasErrors || invalidPersistedState,
                    "bg-slate-300": !hasErrors && props.isMinimized && !invalidPersistedState,
                    "bg-slate-100": !hasErrors && !props.isMinimized && !invalidPersistedState,
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

            <HeaderSeparator />

            <StatusIndicator
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={props.isMinimized}
            />

            <HeaderSeparator />

            <DataChannelButtons
                workbench={props.workbench}
                moduleInstance={props.moduleInstance}
                isMinimized={props.isMinimized}
                isMaximized={props.isMaximized}
                isSnapshotMode={isSnapshot}
            />

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
                disabled={isSnapshot}
                title={isSnapshot ? "Cannot remove modules in snapshot mode" : "Remove this module"}
                colorScheme={DenseIconButtonColorScheme.DANGER}
            >
                <Close fontSize="inherit" />
            </DenseIconButton>
        </div>
    );
};

function HeaderSeparator(): React.ReactNode {
    // The funky-looking class selector hides all separators that directly follows another separator
    return <div className="mx-1 h-1/2 w-px bg-slate-300 [:where(&+&)]:hidden" />;
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
            className={resolveClassNames("flex min-w-0 grow items-center p-1.5 text-sm font-bold", {
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
                    className="mr-1 ml-2 min-w-0 overflow-hidden text-xs font-light text-ellipsis whitespace-nowrap"
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
        <>
            {syncedSettings.map((setting) => (
                <Tooltip
                    title={`This module syncs its "${SyncSettingsMeta[setting].name}" setting on the current page.`}
                    key={setting}
                >
                    <span className="mr-1 ml-1 flex cursor-help items-center justify-center rounded-sm bg-indigo-700 p-1 text-xs leading-none font-bold text-white">
                        {SyncSettingsMeta[setting].abbreviation}
                    </span>
                </Tooltip>
            ))}
        </>
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
                <DenseIconButton
                    id={`moduleinstance-${props.moduleInstance.getId()}-data-channel-origin`}
                    ref={dataChannelOriginRef}
                    className="cursor-grab touch-none"
                    title={makeChannelOutButtonTitle()}
                    disabled={props.isSnapshotMode}
                    onPointerDown={handleDataChannelOriginPointerDown}
                >
                    <Badge badgeContent={numOutgoingConnections} className="flex p-0.5" invisible={props.isMinimized}>
                        <Output fontSize="inherit" />
                    </Badge>
                </DenseIconButton>
            )}
            {hasDataReceiver && (
                <DenseIconButton
                    title={makeChannelInButtonTitle()}
                    onPointerDown={handleReceiverPointerDown}
                    onPointerUp={handleReceiversPointerUp}
                >
                    <Badge badgeContent={numIncomingConnections} className="flex p-0.5" invisible={props.isMinimized}>
                        <Input fontSize="inherit" />
                    </Badge>
                </DenseIconButton>
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

    function handleShowLogClick(e: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();

        if (rightSettingsPanelWidth <= SETTINGS_PANEL_MIN_VISIBLE_WIDTH_PERCENT) {
            setRightSettingsPanelWidth(SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT);
        }

        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setRightDrawerContent(RightDrawerContent.ModuleInstanceLog);
    }

    function makeHotStatusMessages(): React.ReactNode {
        return (
            <div className="flex flex-col gap-2 p-2">
                {hotStatusMessages.map((entry, i) => (
                    <MenuText key={`${entry.message}-${i}`}>
                        {entry.type === StatusMessageType.Error && <Error fontSize="inherit" color="error" />}
                        {entry.type === StatusMessageType.Warning && <Warning fontSize="inherit" color="warning" />}
                        <span
                            className="ml-2 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
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
                <div className="flex cursor-help items-center justify-center px-1">
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
                    <MenuButton className="flex items-center justify-center rounded-sm p-1 text-sm hover:bg-blue-200">
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
                            <div className="my-1 h-0.5 w-full bg-gray-300" />
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

    return <>{stateIndicators}</>;
}

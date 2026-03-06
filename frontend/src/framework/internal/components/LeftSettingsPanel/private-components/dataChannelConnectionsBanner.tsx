import React from "react";

import { GuiState, LeftDrawerContent } from "@framework/GuiMessageBroker";
import { useConnectionGroupColors } from "@framework/internal/components/useConnectionGroupColors";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { ChannelManagerNotificationTopic } from "@framework/internal/DataChannels/ChannelManager";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";

type DataChannelConnectionsBannerProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

type ConnectionInfo = {
    sourceModuleInstanceId: string;
    sourceModuleTitle: string;
    channelDisplayName: string;
    receiverDisplayName: string;
};

type DownstreamInfo = {
    targetModuleInstanceId: string;
    targetModuleTitle: string;
    channelDisplayName: string;
};

/**
 * Shows compact colored cards for each data channel connection.
 * Each card shows a channel name + connected module, colored by connection group.
 * Hovering highlights the connected module on the dashboard.
 * Clicking navigates to that module's settings.
 */
export const DataChannelConnectionsBanner: React.FC<DataChannelConnectionsBannerProps> = (props) => {
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const connectionGroupMap = useConnectionGroupColors();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [, forceRerender] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
        const channelManager = props.moduleInstance.getChannelManager();
        const unsub = channelManager.subscribe(ChannelManagerNotificationTopic.STATE, forceRerender);
        return unsub;
    }, [props.moduleInstance, forceRerender]);

    React.useEffect(() => {
        const unsubs: (() => void)[] = [];
        for (const instance of moduleInstances) {
            unsubs.push(instance.getChannelManager().subscribe(ChannelManagerNotificationTopic.STATE, forceRerender));
        }
        return () => unsubs.forEach((fn) => fn());
    }, [moduleInstances, forceRerender]);

    React.useEffect(() => {
        return () => {
            guiMessageBroker.setState(GuiState.HighlightedModuleInstanceId, null);
        };
    }, [guiMessageBroker]);

    const incomingConnections = getIncomingConnections(props.moduleInstance, moduleInstances);
    const outgoingConnections = getOutgoingConnections(props.moduleInstance, moduleInstances);

    if (incomingConnections.length === 0 && outgoingConnections.length === 0) {
        return null;
    }

    function getColorForConnection(publisherInstanceId: string, channelDisplayName: string): string | null {
        const pubInfo = connectionGroupMap.get(publisherInstanceId);
        if (!pubInfo) return null;
        const group = pubInfo.groups.find(
            (g) => g.publisherInstanceId === publisherInstanceId && g.channelDisplayName === channelDisplayName,
        );
        return group?.color ?? null;
    }

    function handleNavigateToModule(moduleInstanceId: string) {
        guiMessageBroker.setState(GuiState.HighlightedModuleInstanceId, null);
        dashboard.setActiveModuleInstanceId(moduleInstanceId);
        guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        const currentWidth = guiMessageBroker.getState(GuiState.LeftSettingsPanelWidthInPercent);
        if (currentWidth <= 5) {
            guiMessageBroker.setState(GuiState.LeftSettingsPanelWidthInPercent, 20);
        }
    }

    function handleHighlight(moduleInstanceId: string) {
        guiMessageBroker.setState(GuiState.HighlightedModuleInstanceId, moduleInstanceId);
    }

    function handleUnhighlight() {
        guiMessageBroker.setState(GuiState.HighlightedModuleInstanceId, null);
    }

    return (
        <div className="flex flex-col gap-1 mb-3">
            {incomingConnections.map((conn, idx) => {
                const color = getColorForConnection(conn.sourceModuleInstanceId, conn.channelDisplayName);
                return (
                    <ConnectionCard
                        key={`in-${idx}`}
                        direction="in"
                        moduleName={conn.sourceModuleTitle}
                        channelName={conn.channelDisplayName}
                        color={color}
                        onClick={() => handleNavigateToModule(conn.sourceModuleInstanceId)}
                        onMouseEnter={() => handleHighlight(conn.sourceModuleInstanceId)}
                        onMouseLeave={handleUnhighlight}
                    />
                );
            })}
            {outgoingConnections.map((conn, idx) => {
                const color = getColorForConnection(props.moduleInstance.getId(), conn.channelDisplayName);
                return (
                    <ConnectionCard
                        key={`out-${idx}`}
                        direction="out"
                        moduleName={conn.targetModuleTitle}
                        channelName={conn.channelDisplayName}
                        color={color}
                        onClick={() => handleNavigateToModule(conn.targetModuleInstanceId)}
                        onMouseEnter={() => handleHighlight(conn.targetModuleInstanceId)}
                        onMouseLeave={handleUnhighlight}
                    />
                );
            })}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Compact connection card
// ---------------------------------------------------------------------------

type ConnectionCardProps = {
    direction: "in" | "out";
    moduleName: string;
    channelName: string;
    color: string | null;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

function ConnectionCard(props: ConnectionCardProps): React.ReactNode {
    const color = props.color ?? "#94a3b8"; // slate-400 fallback
    const isIncoming = props.direction === "in";
    const arrow = isIncoming ? "←" : "→";
    const label = isIncoming ? "from" : "to";

    return (
        <button
            className="flex items-center gap-1.5 w-full text-left text-xs rounded cursor-pointer transition-all hover:brightness-95 active:scale-[0.99]"
            style={{
                backgroundColor: hexToRgba(color, 0.08),
                border: `1px solid ${hexToRgba(color, 0.25)}`,
                padding: "4px 8px",
            }}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            title={`Click to open settings. Channel: ${props.channelName}`}
        >
            <span className="shrink-0 font-mono text-[0.65rem] leading-none" style={{ color }}>
                {arrow}
            </span>
            <span className="shrink-0 font-medium truncate" style={{ color: darken(color, 0.25), maxWidth: "55%" }}>
                {props.moduleName}
            </span>
            <span className="truncate opacity-60" style={{ color: darken(color, 0.15) }}>
                {label} {props.channelName}
            </span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, amount: number): string {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get all incoming data channel connections for a module instance.
 * This finds all receivers on this module that are subscribed to channels on other modules.
 */
function getIncomingConnections(
    moduleInstance: ModuleInstance<any, any>,
    allModuleInstances: ModuleInstance<any, any>[],
): ConnectionInfo[] {
    const connections: ConnectionInfo[] = [];
    const receivers = moduleInstance.getChannelManager().getReceivers();

    for (const receiver of receivers) {
        const channel = receiver.getChannel();
        if (!channel) continue;

        const sourceModuleInstanceId = channel.getManager().getModuleInstanceId();
        if (sourceModuleInstanceId === moduleInstance.getId()) continue; // Skip self-connections

        const sourceInstance = allModuleInstances.find((inst) => inst.getId() === sourceModuleInstanceId);
        if (!sourceInstance) continue;

        connections.push({
            sourceModuleInstanceId,
            sourceModuleTitle: sourceInstance.getTitle(),
            channelDisplayName: channel.getDisplayName(),
            receiverDisplayName: receiver.getDisplayName(),
        });
    }

    return connections;
}

/**
 * Get all outgoing data channel connections for a module instance.
 * This finds all other modules' receivers that are subscribed to channels on this module.
 */
function getOutgoingConnections(
    moduleInstance: ModuleInstance<any, any>,
    allModuleInstances: ModuleInstance<any, any>[],
): DownstreamInfo[] {
    const connections: DownstreamInfo[] = [];
    const channels = moduleInstance.getChannelManager().getChannels();

    if (channels.length === 0) return connections;

    // For each channel this module publishes, find all receivers across all modules subscribed to it
    for (const channel of channels) {
        for (const otherInstance of allModuleInstances) {
            if (otherInstance.getId() === moduleInstance.getId()) continue;

            const otherReceivers = otherInstance.getChannelManager().getReceivers();
            for (const receiver of otherReceivers) {
                const subscribedChannel = receiver.getChannel();
                if (
                    subscribedChannel &&
                    subscribedChannel.getIdString() === channel.getIdString() &&
                    subscribedChannel.getManager().getModuleInstanceId() === moduleInstance.getId()
                ) {
                    connections.push({
                        targetModuleInstanceId: otherInstance.getId(),
                        targetModuleTitle: otherInstance.getTitle(),
                        channelDisplayName: channel.getDisplayName(),
                    });
                }
            }
        }
    }

    return connections;
}

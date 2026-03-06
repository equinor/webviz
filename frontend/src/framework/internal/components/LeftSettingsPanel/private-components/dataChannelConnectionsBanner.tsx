import React from "react";

import { CallMade, CallReceived } from "@mui/icons-material";

import { GuiState, LeftDrawerContent } from "@framework/GuiMessageBroker";
import { useConnectionGroupColors } from "@framework/internal/components/useConnectionGroupColors";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { ChannelManagerNotificationTopic } from "@framework/internal/DataChannels/ChannelManager";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { Tooltip } from "@lib/components/Tooltip";
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
 * Shows a persistent banner in the module settings panel indicating:
 * - Which modules this module RECEIVES data from (for submodules/receivers)
 * - Which modules this module SENDS data to (for main/producer modules)
 *
 * Clicking on a module name navigates to that module's settings.
 */
export const DataChannelConnectionsBanner: React.FC<DataChannelConnectionsBannerProps> = (props) => {
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const connectionGroupMap = useConnectionGroupColors();

    const [, forceRerender] = React.useReducer((x: number) => x + 1, 0);

    // Subscribe to channel manager state changes to re-render when connections change
    React.useEffect(() => {
        const channelManager = props.moduleInstance.getChannelManager();
        const unsub = channelManager.subscribe(
            ChannelManagerNotificationTopic.STATE,
            forceRerender,
        );
        return unsub;
    }, [props.moduleInstance, forceRerender]);

    // Also subscribe to all module instances' channel manager state changes
    // so we can track downstream connections
    React.useEffect(() => {
        const unsubs: (() => void)[] = [];
        for (const instance of moduleInstances) {
            const channelManager = instance.getChannelManager();
            unsubs.push(channelManager.subscribe(ChannelManagerNotificationTopic.STATE, forceRerender));
        }
        return () => unsubs.forEach((fn) => fn());
    }, [moduleInstances, forceRerender]);

    const incomingConnections = getIncomingConnections(props.moduleInstance, moduleInstances);
    const outgoingConnections = getOutgoingConnections(props.moduleInstance, moduleInstances);

    if (incomingConnections.length === 0 && outgoingConnections.length === 0) {
        return null;
    }

    // Build a lookup: for a given source→receiver channel connection, find the group color.
    // A group is defined by (publisherInstanceId, channelDisplayName).
    function getColorForConnection(publisherInstanceId: string, channelDisplayName: string): string | null {
        // Look up the publisher's connection info and find the group matching this channel
        const pubInfo = connectionGroupMap.get(publisherInstanceId);
        if (!pubInfo) return null;
        const group = pubInfo.groups.find(
            (g) => g.publisherInstanceId === publisherInstanceId && g.channelDisplayName === channelDisplayName,
        );
        return group?.color ?? null;
    }

    function handleNavigateToModule(moduleInstanceId: string) {
        dashboard.setActiveModuleInstanceId(moduleInstanceId);
        const guiMessageBroker = props.workbench.getGuiMessageBroker();
        guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        const currentWidth = guiMessageBroker.getState(GuiState.LeftSettingsPanelWidthInPercent);
        if (currentWidth <= 5) {
            guiMessageBroker.setState(GuiState.LeftSettingsPanelWidthInPercent, 20);
        }
    }

    return (
        <div className="flex flex-col gap-1.5 mb-3">
            {incomingConnections.length > 0 && (
                <div
                    className="rounded p-2 text-xs border"
                    style={makeSectionStyle(incomingConnections.map((c) => getColorForConnection(c.sourceModuleInstanceId, c.channelDisplayName)))}
                >
                    <div
                        className="flex items-center gap-1 mb-1 font-semibold"
                        style={makeSectionTextStyle(incomingConnections.map((c) => getColorForConnection(c.sourceModuleInstanceId, c.channelDisplayName)))}
                    >
                        <CallReceived style={{ fontSize: 14 }} />
                        <span>Receives data from:</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-5">
                        {incomingConnections.map((conn, idx) => {
                            const color = getColorForConnection(conn.sourceModuleInstanceId, conn.channelDisplayName);
                            return (
                                <Tooltip
                                    key={idx}
                                    title={`Click to view settings for "${conn.sourceModuleTitle}". Channel: ${conn.channelDisplayName}`}
                                >
                                    <button
                                        className="text-left rounded px-1.5 py-0.5 transition-colors cursor-pointer font-medium underline decoration-dotted underline-offset-2 flex items-center gap-1.5"
                                        style={makeItemStyle(color)}
                                        onClick={() => handleNavigateToModule(conn.sourceModuleInstanceId)}
                                    >
                                        {color && (
                                            <span
                                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                                style={{ border: `1.5px solid ${color}`, backgroundColor: "transparent" }}
                                            />
                                        )}
                                        {conn.sourceModuleTitle}
                                        <span style={{ opacity: 0.7 }} className="font-normal ml-1">
                                            ({conn.channelDisplayName})
                                        </span>
                                    </button>
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>
            )}
            {outgoingConnections.length > 0 && (
                <div
                    className="rounded p-2 text-xs border"
                    style={makeSectionStyle(outgoingConnections.map((c) => getColorForConnection(props.moduleInstance.getId(), c.channelDisplayName)))}
                >
                    <div
                        className="flex items-center gap-1 mb-1 font-semibold"
                        style={makeSectionTextStyle(outgoingConnections.map((c) => getColorForConnection(props.moduleInstance.getId(), c.channelDisplayName)))}
                    >
                        <CallMade style={{ fontSize: 14 }} />
                        <span>Sends data to:</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-5">
                        {outgoingConnections.map((conn, idx) => {
                            const color = getColorForConnection(props.moduleInstance.getId(), conn.channelDisplayName);
                            return (
                                <Tooltip
                                    key={idx}
                                    title={`Click to view settings for "${conn.targetModuleTitle}". Channel: ${conn.channelDisplayName}`}
                                >
                                    <button
                                        className="text-left rounded px-1.5 py-0.5 transition-colors cursor-pointer font-medium underline decoration-dotted underline-offset-2 flex items-center gap-1.5"
                                        style={makeItemStyle(color)}
                                        onClick={() => handleNavigateToModule(conn.targetModuleInstanceId)}
                                    >
                                        {color && (
                                            <span
                                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: color }}
                                            />
                                        )}
                                        {conn.targetModuleTitle}
                                        <span style={{ opacity: 0.7 }} className="font-normal ml-1">
                                            ({conn.channelDisplayName})
                                        </span>
                                    </button>
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Creates inline styles for a banner section background, using the first available
 * connection group color at low opacity. Falls back to neutral gray.
 */
function makeSectionStyle(colors: (string | null)[]): React.CSSProperties {
    const color = colors.find((c) => c != null);
    if (!color) return { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }; // slate-50 / slate-200
    return {
        backgroundColor: hexToRgba(color, 0.08),
        borderColor: hexToRgba(color, 0.25),
    };
}

function makeSectionTextStyle(colors: (string | null)[]): React.CSSProperties {
    const color = colors.find((c) => c != null);
    if (!color) return { color: "#475569" }; // slate-600
    return { color: darken(color, 0.3) };
}

function makeItemStyle(color: string | null): React.CSSProperties {
    if (!color) return { color: "#334155" }; // slate-700
    return { color: darken(color, 0.25) };
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Darken a hex color by mixing towards black. amount 0 = unchanged, 1 = black. */
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

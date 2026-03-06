import React from "react";

import { useActiveDashboard } from "@framework/internal/components/ActiveDashboardBoundary";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { ChannelManagerNotificationTopic } from "@framework/internal/DataChannels/ChannelManager";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

/**
 * A distinct set of colors for connection groups.
 * Each connection group (a publisher + its subscribers) gets one color.
 * Colors are chosen to be visually distinct and work well as border/strip colors.
 */
const CONNECTION_GROUP_COLORS = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
    "#ec4899", // pink
    "#14b8a6", // teal
    "#84cc16", // lime
];

export type ConnectionGroup = {
    /** The publisher module instance ID */
    publisherInstanceId: string;
    /** All subscriber module instance IDs */
    subscriberInstanceIds: string[];
    /** The assigned color for this group */
    color: string;
    /** Channel display name */
    channelDisplayName: string;
};

export type ModuleConnectionInfo = {
    /** Connection groups this module belongs to (as publisher or subscriber) */
    groups: ConnectionGroup[];
    /** The colors assigned to this module (one per group it belongs to) */
    colors: string[];
    /** Whether this module is a publisher in any group */
    isPublisher: boolean;
    /** Whether this module is a subscriber in any group */
    isSubscriber: boolean;
    /** Names of connected modules, for tooltip */
    connectedModuleTitles: Array<{ title: string; role: "source" | "target"; channelName: string }>;
};

/**
 * Computes connection groups for all modules on the dashboard.
 * A connection group is a publisher module + all modules whose receivers subscribe to its channels.
 * Returns a Map from moduleInstanceId → ModuleConnectionInfo.
 */
export function useConnectionGroupColors(): Map<string, ModuleConnectionInfo> {
    const dashboard = useActiveDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);

    const [, forceRerender] = React.useReducer((x: number) => x + 1, 0);

    // Subscribe to all modules' channel manager state changes
    React.useEffect(() => {
        const unsubs: (() => void)[] = [];
        for (const instance of moduleInstances) {
            unsubs.push(instance.getChannelManager().subscribe(ChannelManagerNotificationTopic.STATE, forceRerender));
        }
        return () => unsubs.forEach((fn) => fn());
    }, [moduleInstances, forceRerender]);

    return React.useMemo(() => {
        return computeConnectionGroups(moduleInstances);
    }, [moduleInstances, forceRerender]); // eslint-disable-line react-hooks/exhaustive-deps
}

function computeConnectionGroups(moduleInstances: ModuleInstance<any, any>[]): Map<string, ModuleConnectionInfo> {
    const result = new Map<string, ModuleConnectionInfo>();

    // Initialize empty entries for all modules
    for (const instance of moduleInstances) {
        result.set(instance.getId(), {
            groups: [],
            colors: [],
            isPublisher: false,
            isSubscriber: false,
            connectedModuleTitles: [],
        });
    }

    // Build connection groups: for each module that publishes channels,
    // find all subscribers and form a group
    const groups: ConnectionGroup[] = [];
    let colorIndex = 0;

    for (const publisherInstance of moduleInstances) {
        const channels = publisherInstance.getChannelManager().getChannels();
        if (channels.length === 0) continue;

        for (const channel of channels) {
            const subscriberIds: string[] = [];

            for (const otherInstance of moduleInstances) {
                if (otherInstance.getId() === publisherInstance.getId()) continue;

                const otherReceivers = otherInstance.getChannelManager().getReceivers();
                for (const receiver of otherReceivers) {
                    const subscribedChannel = receiver.getChannel();
                    if (
                        subscribedChannel &&
                        subscribedChannel.getIdString() === channel.getIdString() &&
                        subscribedChannel.getManager().getModuleInstanceId() === publisherInstance.getId()
                    ) {
                        if (!subscriberIds.includes(otherInstance.getId())) {
                            subscriberIds.push(otherInstance.getId());
                        }
                    }
                }
            }

            if (subscriberIds.length > 0) {
                const group: ConnectionGroup = {
                    publisherInstanceId: publisherInstance.getId(),
                    subscriberInstanceIds: subscriberIds,
                    color: CONNECTION_GROUP_COLORS[colorIndex % CONNECTION_GROUP_COLORS.length],
                    channelDisplayName: channel.getDisplayName(),
                };
                groups.push(group);
                colorIndex++;
            }
        }
    }

    // Assign groups to modules
    for (const group of groups) {
        // Publisher
        const publisherInfo = result.get(group.publisherInstanceId);
        if (publisherInfo) {
            publisherInfo.groups.push(group);
            if (!publisherInfo.colors.includes(group.color)) {
                publisherInfo.colors.push(group.color);
            }
            publisherInfo.isPublisher = true;

            // Add connected module titles for tooltip
            for (const subId of group.subscriberInstanceIds) {
                const subInstance = moduleInstances.find((inst) => inst.getId() === subId);
                if (
                    subInstance &&
                    !publisherInfo.connectedModuleTitles.some(
                        (t) => t.title === subInstance.getTitle() && t.role === "target",
                    )
                ) {
                    publisherInfo.connectedModuleTitles.push({
                        title: subInstance.getTitle(),
                        role: "target",
                        channelName: group.channelDisplayName,
                    });
                }
            }
        }

        // Subscribers
        for (const subId of group.subscriberInstanceIds) {
            const subInfo = result.get(subId);
            if (subInfo) {
                subInfo.groups.push(group);
                if (!subInfo.colors.includes(group.color)) {
                    subInfo.colors.push(group.color);
                }
                subInfo.isSubscriber = true;

                // Add connected module title for tooltip
                const pubInstance = moduleInstances.find((inst) => inst.getId() === group.publisherInstanceId);
                if (
                    pubInstance &&
                    !subInfo.connectedModuleTitles.some(
                        (t) => t.title === pubInstance.getTitle() && t.role === "source",
                    )
                ) {
                    subInfo.connectedModuleTitles.push({
                        title: pubInstance.getTitle(),
                        role: "source",
                        channelName: group.channelDisplayName,
                    });
                }
            }
        }
    }

    return result;
}

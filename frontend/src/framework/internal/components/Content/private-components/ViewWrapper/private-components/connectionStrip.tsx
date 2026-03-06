import type React from "react";

import { GuiState, LeftDrawerContent } from "@framework/GuiMessageBroker";
import { useActiveDashboard } from "@framework/internal/components/ActiveDashboardBoundary";
import type { ModuleConnectionInfo } from "@framework/internal/components/useConnectionGroupColors";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { Tooltip } from "@lib/components/Tooltip";

type ConnectionStripProps = {
    connectionInfo: ModuleConnectionInfo;
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
};

/**
 * A thin horizontal bar at the top of a module frame indicating data channel connections.
 * Connected modules share the same color. The bar visually differentiates roles:
 *
 * - **Publisher (source)**: solid, thicker bar — this is the module whose settings control the data
 * - **Subscriber (receiver)**: thinner dashed bar — signals dependency on the source module
 *
 * When a module participates in multiple connection groups, color segments are shown side by side.
 * Hovering shows a tooltip listing connected modules. Clicking navigates to the source module.
 */
export const ConnectionStrip: React.FC<ConnectionStripProps> = (props) => {
    const dashboard = useActiveDashboard();
    const { connectionInfo, workbench } = props;

    // Build tooltip
    const tooltipLines: string[] = [];

    if (connectionInfo.isPublisher && !connectionInfo.isSubscriber) {
        tooltipLines.push("⬤ Source module — change settings here to affect connected modules:");
    } else if (connectionInfo.isSubscriber && !connectionInfo.isPublisher) {
        tooltipLines.push("◯ Receives data — click to go to source module:");
    } else {
        tooltipLines.push("Source & receiver:");
    }

    for (const entry of connectionInfo.connectedModuleTitles) {
        const arrow = entry.role === "source" ? "← from" : "→ to";
        tooltipLines.push(`  ${arrow} ${entry.title}`);
    }
    const tooltip = tooltipLines.join("\n");

    function handleClick(e: React.MouseEvent) {
        e.stopPropagation();

        // For subscribers, navigate to the source (publisher) module
        // For publishers, navigate to the first subscriber
        const targetGroup = connectionInfo.groups[0];
        if (!targetGroup) return;

        const targetId = connectionInfo.isSubscriber
            ? targetGroup.publisherInstanceId
            : targetGroup.subscriberInstanceIds[0];

        if (!targetId) return;

        dashboard.setActiveModuleInstanceId(targetId);
        const guiMessageBroker = workbench.getGuiMessageBroker();
        guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        const currentWidth = guiMessageBroker.getState(GuiState.LeftSettingsPanelWidthInPercent);
        if (currentWidth <= 5) {
            guiMessageBroker.setState(GuiState.LeftSettingsPanelWidthInPercent, 20);
        }
    }

    const isPublisher = connectionInfo.isPublisher;
    const barHeight = isPublisher ? "h-1.5" : "h-1";

    // Single connection group
    if (connectionInfo.colors.length === 1) {
        const color = connectionInfo.colors[0];
        return (
            <Tooltip title={tooltip}>
                <div
                    className={`w-full shrink-0 cursor-pointer z-20 ${barHeight} transition-all hover:opacity-80`}
                    style={
                        isPublisher
                            ? { backgroundColor: color }
                            : {
                                  backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, transparent 6px, transparent 10px)`,
                              }
                    }
                    onClick={handleClick}
                />
            </Tooltip>
        );
    }

    // Multiple connection groups: segments side by side
    return (
        <Tooltip title={tooltip}>
            <div
                className={`w-full shrink-0 cursor-pointer z-20 ${barHeight} flex flex-row transition-all hover:opacity-80`}
                onClick={handleClick}
            >
                {connectionInfo.colors.map((color, idx) => (
                    <div
                        key={idx}
                        className="grow"
                        style={
                            isPublisher
                                ? { backgroundColor: color }
                                : {
                                      backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, transparent 6px, transparent 10px)`,
                                  }
                        }
                    />
                ))}
            </div>
        </Tooltip>
    );
};

import { type Workbench } from "@framework/Workbench";
import { useActiveDashboard } from "../ActiveDashboardBoundary";
import React from "react";
import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { DashboardTopic, type LayoutElement } from "@framework/internal/Dashboard";
import { EmptyLayout } from "./private-components/EmptyLayout";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { convertLayoutRectToRealRect } from "./utils/layout";
import { ViewWrapper } from "../Content/private-components/ViewWrapper";
import type { Vec2 } from "@lib/utils/vec2";
import type { Size2D } from "@lib/utils/geometry";
import { DebugOverlay } from "./debug/DebugOverlay";
import { makeLayoutTreeFromLayout, type LayoutNode } from "./controllers/LayoutNode";
import { GuiEvent } from "@framework/GuiMessageBroker";

export type LayoutProps = {
    workbench: Workbench;
};

export function Layout(props: LayoutProps) {
    const dashboard = useActiveDashboard();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const viewportRef = React.useRef<HTMLDivElement>(null);
    const viewportSize = useElementSize(viewportRef);

    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ModuleInstances);
    const dashboardLayout = usePublishSubscribeTopicValue(dashboard, DashboardTopic.Layout);

    const previewLayout = null;

    const actualLayout = dashboardLayout;

    const [draggingModuleId, setDraggingModuleId] = React.useState<string | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2 | null>(null);
    const [layoutRoot, setLayoutRoot] = React.useState<LayoutNode>(makeLayoutTreeFromLayout(actualLayout));

    React.useEffect(
        function makeGuiSubscriptions() {
            const unsubscribeFromRemoveRequest = guiMessageBroker.subscribeToEvent(
                GuiEvent.RemoveModuleInstanceRequest,
                function handleRemoveModuleInstanceRequest(event) {
                    layoutRoot.removeModuleInstanceNode(event.moduleInstanceId);
                    dashboard.removeModuleInstance(event.moduleInstanceId);
                    setLayoutRoot(makeLayoutTreeFromLayout(dashboard.getLayout()));
                },
            );

            return function cleanup() {
                unsubscribeFromRemoveRequest();
            };
        },
        [dashboard, guiMessageBroker],
    );

    return (
        <div className="w-full h-full relative" ref={viewportRef}>
            {/* Empty layout */}
            <EmptyLayout visible={moduleInstances.length === 0} />

            {/* Debug overlay */}
            <DebugOverlay enabled={true} root={layoutRoot} realSize={viewportSize} />

            {/* Actual layout */}
            {moduleInstances.map((instance) => {
                const layoutProps = computeModuleInstanceLayoutProps(instance, actualLayout, viewportSize);
                if (!layoutProps) return null;

                const isDragged = draggingModuleId === instance.getId();

                return (
                    <ViewWrapper
                        key={instance.getId()}
                        moduleInstance={instance}
                        workbench={props.workbench}
                        isDragged={isDragged}
                        dragPosition={dragPosition ?? { x: 0, y: 0 }}
                        changingLayout={!!draggingModuleId || !!previewLayout}
                        {...layoutProps}
                    />
                );
            })}
        </div>
    );
}

function computeModuleInstanceLayoutProps(
    instance: ModuleInstance<any>,
    layoutElements: LayoutElement[],
    viewportSize: Size2D,
) {
    const el = layoutElements.find((le) => le.moduleInstanceId === instance.getId());
    if (!el) return null;

    const rect = convertLayoutRectToRealRect(el, viewportSize);
    return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        isMaximized: el.maximized,
        isMinimized: el.minimized,
    };
}

import React from "react";

import { DashboardTopic, type LayoutElement } from "@framework/internal/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { type Workbench } from "@framework/Workbench";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import type { Size2D } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { ViewWrapper } from "../Content/private-components/ViewWrapper";

import {
    LayoutController,
    LayoutControllerTopic,
    ModeKind,
    type LayoutControllerBindings,
} from "./controllers/LayoutController";
import { DebugOverlay } from "./debug/DebugOverlay";
import { EmptyLayout } from "./private-components/EmptyLayout";
import { convertLayoutRectToRealRect } from "./utils/layout";

export type LayoutProps = {
    workbench: Workbench;
};

export function Layout(props: LayoutProps) {
    const dashboard = useActiveDashboard();
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const viewportRef = React.useRef<HTMLDivElement>(null);
    const viewportRect = useElementBoundingRect(viewportRef);

    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ModuleInstances);

    const layoutControllerBindings = React.useMemo(
        function makeBindings() {
            const bindings: LayoutControllerBindings = {
                getViewportRect: () => {
                    if (!viewportRect) {
                        return { x: 0, y: 0, width: 0, height: 0 };
                    }
                    return viewportRect;
                },
            };
            return bindings;
        },
        [viewportRect],
    );

    const layoutControllerRef = React.useRef<LayoutController>(
        new LayoutController(guiMessageBroker, dashboard, layoutControllerBindings),
    );
    const layoutController = layoutControllerRef.current;

    const layoutControllerMode = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.MODE);

    const layout = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.LAYOUT);
    const layoutTree = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.LAYOUT_TREE);

    React.useEffect(
        function updateBindings() {
            layoutController.updateBindings(layoutControllerBindings);
        },
        [layoutController, layoutControllerBindings],
    );

    return (
        <div className="w-full h-full relative" ref={viewportRef}>
            {/* Empty layout */}
            <EmptyLayout visible={moduleInstances.length === 0} />

            {/* Debug overlay */}
            {layoutTree && (
                <DebugOverlay
                    enabled={true}
                    root={layoutTree}
                    realSize={viewportRect ? viewportRect : { width: 0, height: 0 }}
                    draggingModuleInstanceId={
                        layoutControllerMode.kind === ModeKind.DRAGGING ? layoutControllerMode.source.id : null
                    }
                />
            )}

            {/* Actual layout */}
            {moduleInstances.map((instance) => {
                const layoutProps = computeModuleInstanceLayoutProps(instance, layout, viewportRect);
                if (!layoutProps) return null;

                const isDragged =
                    layoutControllerMode.kind === ModeKind.DRAGGING &&
                    layoutControllerMode.source.id === instance.getId();

                return (
                    <ViewWrapper
                        key={instance.getId()}
                        moduleInstance={instance}
                        workbench={props.workbench}
                        isDragged={isDragged}
                        dragPosition={
                            layoutControllerMode.kind === ModeKind.DRAGGING
                                ? layoutControllerMode.dragPosition
                                : { x: 0, y: 0 }
                        }
                        changingLayout={
                            layoutControllerMode.kind === ModeKind.DRAGGING ||
                            layoutControllerMode.kind === ModeKind.RESIZING
                        }
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

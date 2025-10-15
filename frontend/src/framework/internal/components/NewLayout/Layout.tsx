import React from "react";

import { DashboardTopic, type LayoutElement } from "@framework/internal/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { type Workbench } from "@framework/Workbench";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import type { Size2D } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { ViewWrapper } from "../Content/private-components/ViewWrapper";
import { ViewWrapperPlaceholder } from "../Content/private-components/viewWrapperPlaceholder";

import {
    DragSourceKind,
    LayoutController,
    LayoutControllerTopic,
    ModeKind,
    type LayoutControllerBindings,
} from "./controllers/LayoutController";
import { DebugOverlay } from "./debug/DebugOverlay";
import { EmptyLayout } from "./private-components/EmptyLayout";
import { LayoutOverlay } from "./private-components/LayoutOverlay";
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

    const getViewportRect = React.useCallback(function getViewportRect() {
        const el = viewportRef.current;
        if (!el) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        const domRect = el.getBoundingClientRect();
        return { x: domRect.left, y: domRect.top, width: domRect.width, height: domRect.height };
    }, []);

    const layoutControllerBindings = React.useMemo(
        function makeBindings() {
            const bindings: LayoutControllerBindings = {
                getViewportRect,
            };
            return bindings;
        },
        [getViewportRect],
    );

    const layoutController = React.useMemo(() => new LayoutController(), []);

    const layoutControllerMode = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.MODE);

    const layout = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.LAYOUT);
    const layoutTree = usePublishSubscribeTopicValue(layoutController, LayoutControllerTopic.LAYOUT_TREE);

    React.useEffect(
        function attachController() {
            layoutController.attach(guiMessageBroker, dashboard, layoutControllerBindings);
            return () => {
                layoutController.beforeDispose();
            };
        },
        [layoutController, guiMessageBroker, dashboard, layoutControllerBindings],
    );

    React.useEffect(
        function updateBindings() {
            layoutController.updateBindings(layoutControllerBindings);
        },
        [layoutController, layoutControllerBindings],
    );

    React.useEffect(
        function controllerChangeEffect() {
            // Cleanup on unmount or when controller instance is replaced.
            return () => {
                layoutController.beforeDispose();
            };
        },
        [layoutController],
    );

    return (
        <div className="w-full h-full relative" ref={viewportRef}>
            {/* Empty layout */}
            <EmptyLayout visible={moduleInstances.length === 0} />

            {/* Debug overlay */}
            {layoutTree && (
                <DebugOverlay
                    enabled={layoutControllerMode.kind === ModeKind.DRAGGING}
                    root={layoutTree}
                    realSize={viewportRect ? viewportRect : { width: 0, height: 0 }}
                    draggingModuleInstanceId={
                        layoutControllerMode.kind === ModeKind.DRAGGING ? layoutControllerMode.source.id : null
                    }
                />
            )}

            {/* Overlay for showing preview of layout changes */}
            <LayoutOverlay
                layoutController={layoutController}
                viewportSize={viewportRect ? viewportRect : { width: 0, height: 0 }}
            />

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

            {/* Placeholder for new module while dragging */}
            {layoutControllerMode.kind === ModeKind.DRAGGING &&
                layoutControllerMode.source.kind === DragSourceKind.NEW &&
                (() => {
                    const el = layout.find((le) => le.moduleInstanceId === layoutControllerMode.source.id);
                    if (!el) return null;
                    const rect = convertLayoutRectToRealRect(el, viewportRect ? viewportRect : { width: 0, height: 0 });
                    return <ViewWrapperPlaceholder width={rect.width} height={rect.height} x={rect.x} y={rect.y} />;
                })()}

            {/* Overlay to capture all pointer events during drag/resize */}
            {(layoutControllerMode.kind === ModeKind.DRAGGING || layoutControllerMode.kind === ModeKind.RESIZING) &&
                createPortal(<div className="absolute inset-0 w-full h-full z-40" />)}
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

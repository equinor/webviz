import React, { type CSSProperties } from "react";

import { GuiEvent } from "@framework/GuiMessageBroker";
import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import { DashboardTopic } from "@framework/internal/WorkbenchSession/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Size2D } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import type { Vec2 } from "@lib/utils/vec2";
import { WebAsset } from "@mui/icons-material";
import { v4 } from "uuid";

import { ViewWrapper } from "../Content/private-components/ViewWrapper";
import { ViewWrapperPlaceholder } from "../Content/private-components/viewWrapperPlaceholder";

import { LayoutOverlay } from "./components/LayoutOverlay";
import { QuickSwitchDock } from "./components/QuickSwitchDock";
import {
    LayoutController,
    DragSourceKind,
    type DragSource,
    type ResizeSource,
    type LayoutControllerBindings,
} from "./LayoutController";
import type { LayoutNode } from "./LayoutNode";
import { makeLayoutNodes } from "./LayoutNode";

export type LayoutProps = { workbench: Workbench };

export const Layout: React.FC<LayoutProps> = (props: LayoutProps) => {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const dashboard = props.workbench.getWorkbenchSession().getActiveDashboard();

    // DOM refs / size
    const containerRef = React.useRef<HTMLDivElement>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const viewportSize = useElementSize(containerRef);

    // Dashboard topics
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ModuleInstances);
    const trueLayout = usePublishSubscribeTopicValue(dashboard, DashboardTopic.Layout);

    // Temp layout for preview (controller drives this)
    const [previewLayout, setPreviewLayout] = React.useState<LayoutElement[] | null>(null);

    const [rootNode, setRootNode] = React.useState<LayoutNode>(() => makeLayoutNodes(trueLayout));

    // Drag overlay visuals
    const [draggingModuleId, setDraggingModuleId] = React.useState<string | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2 | null>(null);
    const [pointerPos, setPointerPos] = React.useState<Vec2 | null>(null);
    const [tempPlaceholderId, setTempPlaceholderId] = React.useState<string | null>(null);
    const [cursor, setCursor] = React.useState<React.CSSProperties["cursor"]>("default");

    // Build LayoutNode tree (true or temp)
    const layoutElements = previewLayout ?? trueLayout;

    // Expose to controller via ref (stable reference)
    const rootNodeRef = React.useRef<LayoutNode | null>(null);
    rootNodeRef.current = rootNode;

    const isPreviewing =
        !!previewLayout || // preview tree exists (drag/resize)
        !!draggingModuleId || // dragging existing/new module
        !!tempPlaceholderId;

    const bindings = React.useMemo(
        function makeBindings() {
            const bindings: LayoutControllerBindings = {
                // Getters
                getViewportSize: () => viewportSize as Size2D,

                // Effects
                setRootNode: (node: LayoutNode) => {
                    setRootNode(node);
                },
                setTempLayout: (next: LayoutElement[] | null) => setPreviewLayout(next),
                setDragAndClientPosition: (dragPos: Vec2 | null, pointer: Vec2 | null) => {
                    setDragPosition(dragPos);
                    setPointerPos(pointer);
                },
                setDraggingModuleId: (id: string | null) => setDraggingModuleId(id),
                setTempPlaceholderId: (id: string | null) => setTempPlaceholderId(id),
                setCursor: (c: CSSProperties["cursor"]) => setCursor(c),

                // Commits
                commitLayout: (next: LayoutElement[]) => {
                    dashboard.setLayout(next);
                },
                createModuleAndCommit: (moduleName: string, next: LayoutElement[], tempId: string) => {
                    // Show the preview layout immediately so the user sees a tile
                    setPreviewLayout(next);

                    // Atomic create + tempId swap + single setLayout
                    const instance = dashboard.makeAndAddModuleInstance(moduleName);
                    const realId = instance.getId();

                    // replace tempId → realId in `next`
                    const patched = next.map((el) =>
                        el.moduleInstanceId === tempId
                            ? { ...el, moduleInstanceId: realId, moduleName: instance.getName() }
                            : el,
                    );

                    dashboard.setLayout(patched);

                    // Clear temp layout after commit
                    setPreviewLayout(null);
                },

                // Utilities
                toLocalPx: (clientPos: Vec2) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    return rect ? { x: clientPos.x - rect.left, y: clientPos.y - rect.top } : clientPos;
                },
                scheduleFrame: (cb: FrameRequestCallback) => window.requestAnimationFrame(cb),
                cancelFrame: (id: number) => window.cancelAnimationFrame(id),
            };

            return bindings;
        },
        [viewportSize, dashboard],
    );

    const controllerRef = React.useRef<LayoutController | null>(null);
    if (!controllerRef.current) {
        controllerRef.current = new LayoutController(bindings);
    }
    const controller = controllerRef.current;

    const anyModuleMaximized = React.useMemo(() => layoutElements.some((el) => el.maximized), [layoutElements]);

    React.useEffect(
        function updateLayout() {
            controller.setCommittedLayout(trueLayout);

            if (!isPreviewing) {
                setRootNode(makeLayoutNodes(trueLayout));
            }
        },
        [trueLayout, controller, isPreviewing],
    );

    // keep the single instance's bindings fresh
    React.useEffect(
        function updateBindings() {
            controller.updateBindings(bindings);
        },
        [controller, bindings],
    );

    React.useEffect(() => {
        controller.attach();
        return () => controller.detach();
    }, [controller]);

    React.useEffect(
        function makeGuiSubscriptions() {
            const unsubHeader = guiMessageBroker.subscribeToEvent(
                GuiEvent.ModuleHeaderPointerDown,
                (payload: {
                    moduleInstanceId: string;
                    elementPosition: Vec2; // client coords
                    elementSize: Size2D;
                    pointerPosition: Vec2; // client coords
                }) => {
                    controller.startDrag({
                        kind: DragSourceKind.EXISTING,
                        id: payload.moduleInstanceId,
                        elementPos: payload.elementPosition,
                        elementSize: payload.elementSize,
                        pointerDownClientPos: payload.pointerPosition,
                    } as DragSource);
                },
            );

            const unsubNew = guiMessageBroker.subscribeToEvent(
                GuiEvent.NewModulePointerDown,
                (payload: {
                    moduleName: string;
                    elementPosition: Vec2; // client coords (tray item)
                    elementSize: Size2D;
                    pointerPosition: Vec2; // client coords
                }) => {
                    const tempId = v4();
                    controller.startDrag({
                        kind: DragSourceKind.NEW,
                        id: tempId,
                        moduleName: payload.moduleName,
                        elementPos: payload.elementPosition,
                        elementSize: payload.elementSize,
                        pointerDownClientPos: payload.pointerPosition,
                    } as DragSource);
                },
            );

            const unsubRemove = guiMessageBroker.subscribeToEvent(
                GuiEvent.RemoveModuleInstanceRequest,
                (payload: { moduleInstanceId: string }) => {
                    const current = (previewLayout ?? trueLayout) as LayoutElement[];

                    // 2) Remove the element and repack to fill 100%
                    const remaining = current.filter((el) => el.moduleInstanceId !== payload.moduleInstanceId);
                    const adjusted = makeLayoutNodes(remaining).toLayout();

                    // 3) Optimistic preview to avoid flicker (optional but nice)
                    setPreviewLayout(adjusted);

                    // 4) Do the actual cleanup (channels, stores, etc.)
                    dashboard.removeModuleInstance(payload.moduleInstanceId);

                    // 5) Override Dashboard's naive filtered layout with our adjusted one
                    dashboard.setLayout(adjusted);

                    // 6) Clear temp — trueLayout now equals `adjusted`
                    setPreviewLayout(null);
                },
            );

            return function removeGuiSubscriptions() {
                unsubHeader();
                unsubNew();
                unsubRemove();
            };
        },
        [guiMessageBroker, controller, dashboard, previewLayout, trueLayout],
    );

    const onContainerPointerMove = React.useCallback(
        function onContainerPointerMove(e: React.PointerEvent) {
            if (!rootNodeRef.current || isPreviewing) return;
            const local = bindings.toLocalPx({ x: e.clientX, y: e.clientY });
            const hit = rootNodeRef.current.hitTestDivider(local, viewportSize);
            const next = !hit ? "default" : hit.axis === "vertical" ? "ew-resize" : "ns-resize";
            if (cursor !== next) {
                setCursor(next);
            }
        },
        [bindings, viewportSize, cursor, isPreviewing],
    );

    const onContainerPointerDown = React.useCallback(
        function onContainerPointerDown(e: React.PointerEvent) {
            if (anyModuleMaximized || isPreviewing) return;
            if (!rootNodeRef.current) return;
            const clientPos = { x: e.clientX, y: e.clientY };
            const localPos = bindings.toLocalPx(clientPos);
            const hit = rootNodeRef.current.hitTestDivider(localPos, viewportSize);
            if (!hit) {
                return;
            }

            controller.startResize({
                axis: hit.axis,
                containerPath: hit.containerPath,
                index: hit.index,
                pointerDownClientPos: clientPos,
            } as ResizeSource);

            // prevent text selection/scroll during resize
            e.preventDefault();
            e.stopPropagation();
        },
        [controller, bindings, viewportSize, anyModuleMaximized, isPreviewing],
    );

    const convertLayoutRectToRealRect = React.useCallback(function convertLayoutRectToRealRect(
        el: LayoutElement,
        size: Size2D,
    ) {
        return {
            x: el.relX * size.width,
            y: el.relY * size.height,
            width: el.relWidth * size.width,
            height: el.relHeight * size.height,
        };
    }, []);

    const computeModuleLayoutProps = React.useCallback(
        (instance: ModuleInstance<any, any>) => {
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
        },
        [layoutElements, viewportSize, convertLayoutRectToRealRect],
    );

    const onContainerPointerLeave = React.useCallback(function onContainerPointerLeave() {
        setCursor("default");
    }, []);

    const handleFullscreenModuleChange = React.useCallback(
        function handleFullscreenModuleChange(moduleInstanceId: string) {
            const newLayout = layoutElements.map((el) => {
                if (el.moduleInstanceId === moduleInstanceId) {
                    return { ...el, maximized: true };
                } else if (el.maximized) {
                    return { ...el, maximized: false };
                }
                return el;
            });

            dashboard.setActiveModuleInstanceId(moduleInstanceId);

            dashboard.setLayout(newLayout);
        },
        [dashboard, layoutElements],
    );

    return (
        <div ref={rootRef} className="flex flex-col h-full w-full max-w-full">
            <div
                ref={containerRef}
                className="relative grow"
                style={anyModuleMaximized ? undefined : { cursor }}
                onPointerMoveCapture={onContainerPointerMove}
                onPointerLeave={onContainerPointerLeave}
                onPointerDownCapture={onContainerPointerDown}
            >
                {/* Edges / sashes hover highlights */}
                {rootNode && (
                    <LayoutOverlay
                        active={draggingModuleId}
                        root={rootNode}
                        realSize={viewportSize}
                        zIndex={1}
                        pointer={pointerPos ?? { x: -1, y: -1 }}
                    />
                )}

                {/* Modules */}
                {moduleInstances.map((instance) => {
                    const layoutProps = computeModuleLayoutProps(instance);
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

                {/* Quick switch dock */}
                <QuickSwitchDock
                    isOpen={anyModuleMaximized}
                    layoutElements={layoutElements}
                    onActiveModuleChange={handleFullscreenModuleChange}
                    getModuleInstanceName={(moduleInstanceId) => {
                        const el = moduleInstances.find((mi) => mi.getId() === moduleInstanceId);
                        return el ? el.getTitle() : undefined;
                    }}
                />

                {/* Placeholder for NEW module while dragging */}
                {tempPlaceholderId &&
                    (() => {
                        const el = layoutElements.find((le) => le.moduleInstanceId === tempPlaceholderId);
                        if (!el) return null;
                        const r = convertLayoutRectToRealRect(el, viewportSize);
                        return (
                            <ViewWrapperPlaceholder
                                key={tempPlaceholderId}
                                width={r.width}
                                height={r.height}
                                x={r.x}
                                y={r.y}
                            />
                        );
                    })()}

                {/* Empty-state hint */}
                {moduleInstances.length === 0 && (
                    <div className="flex flex-col justify-center items-center w-full h-full text-slate-400 gap-4 text-center p-4 text-sm">
                        <WebAsset fontSize="large" />
                        Drag modules here to add them to the layout
                    </div>
                )}
            </div>
        </div>
    );
};

import React from "react";

import { v4 } from "uuid";

import type { LayoutBox } from "@framework/components/LayoutBox";
import { LayoutBoxComponents, makeLayoutBoxes } from "@framework/components/LayoutBox";
import type { GuiEventPayloads } from "@framework/GuiMessageBroker";
import { GuiEvent } from "@framework/GuiMessageBroker";
import { useModuleInstances, useModuleLayout } from "@framework/internal/hooks/workbenchHooks";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { LayoutElement, Workbench } from "@framework/Workbench";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Rect2D, Size2D } from "@lib/utils/geometry";
import { MANHATTAN_LENGTH, addMarginToRect, pointRelativeToDomRect, rectContainsPoint } from "@lib/utils/geometry";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import type { Vec2 } from "@lib/utils/vec2";
import { multiplyElementWiseVec2, point2Distance, scaleVec2NonUniform, subtractVec2, vec2FromPointerEvent } from "@lib/utils/vec2";

import { ViewWrapper } from "./ViewWrapper";
import { ViewWrapperPlaceholder } from "./viewWrapperPlaceholder";

type LayoutProps = {
    workbench: Workbench;
    activeModuleInstanceId: string | null;
};

function convertLayoutRectToRealRect(element: LayoutElement, size: Size2D): Rect2D {
    return {
        x: element.relX * size.width,
        y: element.relY * size.height,
        width: element.relWidth * size.width,
        height: element.relHeight * size.height,
    };
}

export const Layout: React.FC<LayoutProps> = (props) => {
    const [draggedModuleInstanceId, setDraggedModuleInstanceId] = React.useState<string | null>(null);
    const [position, setPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [pointer, setPointer] = React.useState<Vec2>({ x: -1, y: -1 });
    const [tempLayoutBoxId, setTempLayoutBoxId] = React.useState<string | null>(null);
    const ref = React.useRef<HTMLDivElement>(null);
    const mainRef = React.useRef<HTMLDivElement>(null);
    const layoutDivSize = useElementSize(ref);
    const layoutBoxRef = React.useRef<LayoutBox | null>(null);
    const moduleInstances = useModuleInstances(props.workbench);
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    // We use a temporary layout while dragging elements around
    const [tempLayout, setTempLayout] = React.useState<LayoutElement[] | null>(null);
    const trueLayout = useModuleLayout(props.workbench);
    const layout = tempLayout ?? trueLayout;

    React.useEffect(() => {
        let pointerDownPoint: Vec2 | null = null;
        let pointerDownElementPosition: Vec2 | null = null;
        let pointerDownElementId: string | null = null;
        let pointerDownElementSize: Size2D | null = null;
        let relativePointerPosition: Vec2 = { x: 0, y: 0 };
        let relativePointerToElementDiff: Vec2 = { x: 0, y: 0 };
        let dragging = false;
        let moduleInstanceId: string | null = null;
        let moduleName: string | null = null;
        let originalLayout: LayoutElement[] = props.workbench.getLayout();
        let currentLayout: LayoutElement[] = props.workbench.getLayout();
        let originalLayoutBox = makeLayoutBoxes(originalLayout);
        let currentLayoutBox = originalLayoutBox;
        layoutBoxRef.current = currentLayoutBox;
        let lastTimeStamp = 0;
        let lastMovePosition: Vec2 = { x: 0, y: 0 };
        let delayTimer: ReturnType<typeof setTimeout> | null = null;
        let isNewModule = false;

        function adjustLayout() {
            if (currentLayoutBox && moduleInstanceId) {
                const preview = currentLayoutBox.previewLayout(
                    relativePointerPosition,
                    layoutDivSize,
                    moduleInstanceId,
                    isNewModule,
                );
                if (preview) {
                    currentLayout = preview.toLayout();
                    currentLayoutBox = preview;
                }

                setTempLayout(currentLayout);
                layoutBoxRef.current = currentLayoutBox;

                const draggedElementSize = calcSizeOfDraggedElement();

                setPosition(
                    subtractVec2(
                        relativePointerPosition,
                        multiplyElementWiseVec2(relativePointerToElementDiff, {
                            x: draggedElementSize.width,
                            y: 1,
                        }),
                    ),
                );
            }
            delayTimer = null;
        }

        function handlePointerUp(e: Event) {
            if (!pointerDownPoint) {
                return;
            }
            if (dragging) {
                if (delayTimer) {
                    clearTimeout(delayTimer);
                    adjustLayout();
                }
                if (isNewModule && moduleName) {
                    const layoutElement = currentLayout.find((el) => el.moduleInstanceId === pointerDownElementId);
                    if (layoutElement) {
                        const instance = props.workbench.makeAndAddModuleInstance(moduleName, layoutElement);
                        layoutElement.moduleInstanceId = instance.getId();
                        layoutElement.moduleName = instance.getName();
                    }
                }
                setDraggedModuleInstanceId(null);
                if (isNewModule) {
                    setTempLayoutBoxId(null);
                }
                currentLayoutBox = makeLayoutBoxes(currentLayout);
                originalLayoutBox = currentLayoutBox;
                layoutBoxRef.current = currentLayoutBox;
                setTempLayout(null);
                props.workbench.setLayout(currentLayout);
                setPosition({ x: 0, y: 0 });
                setPointer({ x: -1, y: -1 });

                e.stopPropagation();
                e.preventDefault();
            }
            pointerDownPoint = null;
            pointerDownElementPosition = null;
            pointerDownElementId = null;
            moduleInstanceId = null;
            dragging = false;
            originalLayout = currentLayout;
            removeDraggingEventListeners();
        }

        function calcSizeOfDraggedElement(): Size2D {
            const layoutElement = currentLayout.find((element) => element.moduleInstanceId === pointerDownElementId);
            if (!layoutElement) {
                return { width: 0, height: 0 };
            }
            const rect = convertLayoutRectToRealRect(layoutElement, layoutDivSize);
            return { width: rect.width, height: rect.height };
        }

        function handlePointerMove(e: PointerEvent) {
            if (
                !pointerDownPoint ||
                !ref.current ||
                !pointerDownElementId ||
                !pointerDownElementPosition ||
                !pointerDownElementSize
            ) {
                return;
            }

            // Prevent any scrolling on touch devices
            e.preventDefault();
            e.stopPropagation();

            if (!dragging) {
                if (point2Distance(vec2FromPointerEvent(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    setDraggedModuleInstanceId(pointerDownElementId);
                    moduleInstanceId = pointerDownElementId;
                    const rect = ref.current.getBoundingClientRect();
                    setPosition(pointRelativeToDomRect(pointerDownElementPosition, rect));
                    relativePointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    dragging = true;
                    const factorX = pointerDownElementSize.width === 0 ? 1 : 1 / pointerDownElementSize.width;
                    relativePointerToElementDiff = scaleVec2NonUniform(
                        subtractVec2(pointerDownPoint, pointerDownElementPosition),
                        factorX,
                        1,
                    );
                    lastTimeStamp = e.timeStamp;
                    lastMovePosition = vec2FromPointerEvent(e);
                }
            } else {
                if (!pointerDownElementId || !pointerDownPoint) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                const draggedElementSize = calcSizeOfDraggedElement();
                relativePointerPosition = subtractVec2(vec2FromPointerEvent(e), rect);
                setPosition(
                    subtractVec2(
                        relativePointerPosition,
                        multiplyElementWiseVec2(relativePointerToElementDiff, {
                            x: draggedElementSize.width,
                            y: 1,
                        }),
                    ),
                );
                setPointer(subtractVec2(vec2FromPointerEvent(e), rect));
                const speed = point2Distance(vec2FromPointerEvent(e), lastMovePosition) / (e.timeStamp - lastTimeStamp);
                lastTimeStamp = e.timeStamp;
                lastMovePosition = vec2FromPointerEvent(e);

                if (!rectContainsPoint(addMarginToRect(rect, 25), vec2FromPointerEvent(e))) {
                    currentLayout = originalLayout;
                    currentLayoutBox = originalLayoutBox;
                    setTempLayout(null);
                    layoutBoxRef.current = currentLayoutBox;
                    if (delayTimer) {
                        clearTimeout(delayTimer);
                        delayTimer = null;
                    }
                    return;
                }

                if (delayTimer && speed > 0.5) {
                    clearTimeout(delayTimer);
                    delayTimer = null;
                }
                if (delayTimer === null) {
                    delayTimer = setTimeout(adjustLayout, 500);
                }
            }
        }

        function handleButtonClick(e: KeyboardEvent) {
            if (e.key === "Escape") {
                if (delayTimer) {
                    clearTimeout(delayTimer);
                }
                setTempLayout(null);
                currentLayout = originalLayout;
                pointerDownPoint = null;
                pointerDownElementPosition = null;
                pointerDownElementId = null;
                pointerDownElementSize = null;
                setDraggedModuleInstanceId(null);
                moduleInstanceId = null;
                dragging = false;
                originalLayout = currentLayout;
                currentLayoutBox = makeLayoutBoxes(currentLayout);
                originalLayoutBox = currentLayoutBox;
                isNewModule = false;
                setTempLayoutBoxId(null);
                removeDraggingEventListeners();
            }
        }

        function handleRemoveModuleInstanceRequest(payload: GuiEventPayloads[GuiEvent.RemoveModuleInstanceRequest]) {
            if (delayTimer) {
                clearTimeout(delayTimer);
            }
            if (dragging) {
                return;
            }
            props.workbench.removeModuleInstance(payload.moduleInstanceId);
            currentLayoutBox.removeLayoutElement(payload.moduleInstanceId);
            currentLayout = currentLayoutBox.toLayout();
            originalLayout = currentLayout;
            originalLayoutBox = currentLayoutBox;
            props.workbench.setLayout(currentLayout);
        }

        function addDraggingEventListeners() {
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("keydown", handleButtonClick);
            document.addEventListener("pointercancel", handlePointerUp);
            document.addEventListener("blur-sm", handlePointerUp);
        }

        function removeDraggingEventListeners() {
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("keydown", handleButtonClick);
            document.removeEventListener("pointercancel", handlePointerUp);
            document.removeEventListener("blur-sm", handlePointerUp);
        }

        function handleModuleHeaderPointerDown(payload: GuiEventPayloads[GuiEvent.ModuleHeaderPointerDown]) {
            pointerDownPoint = payload.pointerPosition;
            pointerDownElementPosition = payload.elementPosition;
            pointerDownElementSize = payload.elementSize;
            pointerDownElementId = payload.moduleInstanceId;
            isNewModule = false;
            addDraggingEventListeners();
        }

        function handleNewModulePointerDown(payload: GuiEventPayloads[GuiEvent.NewModulePointerDown]) {
            pointerDownPoint = payload.pointerPosition;
            pointerDownElementPosition = payload.elementPosition;
            pointerDownElementSize = payload.elementSize;
            pointerDownElementId = v4();
            setTempLayoutBoxId(pointerDownElementId);
            isNewModule = true;
            moduleName = payload.moduleName;
            addDraggingEventListeners();
        }

        const removeModuleHeaderPointerDownSubscriber = guiMessageBroker.subscribeToEvent(
            GuiEvent.ModuleHeaderPointerDown,
            handleModuleHeaderPointerDown,
        );
        const removeNewModulePointerDownSubscriber = guiMessageBroker.subscribeToEvent(
            GuiEvent.NewModulePointerDown,
            handleNewModulePointerDown,
        );
        const removeRemoveModuleInstanceRequestSubscriber = guiMessageBroker.subscribeToEvent(
            GuiEvent.RemoveModuleInstanceRequest,
            handleRemoveModuleInstanceRequest,
        );

        return () => {
            removeModuleHeaderPointerDownSubscriber();
            removeNewModulePointerDownSubscriber();
            removeRemoveModuleInstanceRequestSubscriber();
            removeDraggingEventListeners();

            if (delayTimer) {
                clearTimeout(delayTimer);
            }
        };
    }, [layoutDivSize, moduleInstances, guiMessageBroker, props.workbench]);

    function makeTempViewWrapperPlaceholder() {
        if (!tempLayoutBoxId) {
            return null;
        }
        const layoutElement = layout.find((element) => element.moduleInstanceId === tempLayoutBoxId);
        if (!layoutElement) {
            return null;
        }
        const rect = convertLayoutRectToRealRect(layoutElement, layoutDivSize);
        return (
            <ViewWrapperPlaceholder
                key={tempLayoutBoxId}
                width={rect.width}
                height={rect.height}
                x={rect.x}
                y={rect.y}
            />
        );
    }

    const maximizedLayouts = React.useMemo(() => layout.filter((l) => l.maximized), [layout]);
    const minimizedLayouts = React.useMemo(() => layout.filter((l) => !l.maximized), [layout]);

    // TODO: Support multiple expanded modules? Probably fits together with minimizing...
    if (maximizedLayouts.length > 1) throw Error("Multiple expanded modules not supported");

    const minimizedLayoutsHeight = convertRemToPixels(2);
    const minimizedLayoutsMinWidth = convertRemToPixels(16);

    let rows = minimizedLayouts.length;
    let elementsPerRow = 1;
    let elementsInLastRow = 1;

    // Only worry about minimized module positions if we have more than 2 minimized
    if (minimizedLayouts.length && layoutDivSize.width > minimizedLayoutsMinWidth * 2) {
        elementsPerRow = Math.floor(layoutDivSize.width / minimizedLayoutsMinWidth);
        elementsInLastRow = minimizedLayouts.length % elementsPerRow || elementsPerRow;
        rows = Math.ceil(minimizedLayouts.length / elementsPerRow);
    }

    function computeModuleLayoutProps(moduleInstance: ModuleInstance<any>) {
        const moduleId = moduleInstance.getId();
        const layoutElement = layout.find((element) => element.moduleInstanceId === moduleId);

        if (!layoutElement) return null;

        // Standard tiling layout.
        // ! Always uses the tiled layout if we're adjusting the layout
        if (!maximizedLayouts.length || draggedModuleInstanceId) {
            const rect = convertLayoutRectToRealRect(layoutElement, layoutDivSize);

            return { width: rect.width, height: rect.height, x: rect.x, y: rect.y };
        }

        // Maximized view. One module takes up all the space, other ones are minimized
        // Positions is computed, so old tile-layout is stored
        if (layoutElement?.maximized) {
            return {
                x: 0,
                y: minimizedLayoutsHeight * rows,
                height: layoutDivSize.height - minimizedLayoutsHeight * rows,
                width: layoutDivSize.width,
                isMaximized: true,
            };
        } else {
            const idx = minimizedLayouts.findIndex((l) => l.moduleInstanceId === moduleId);

            const col = idx % elementsPerRow;
            const row = Math.floor(idx / elementsPerRow);
            const isLastRow = idx >= minimizedLayouts.length - elementsInLastRow;

            const adjustedWidth = layoutDivSize.width / elementsPerRow;
            const lastRowAdjustedWidth = layoutDivSize.width / elementsInLastRow;

            const width = isLastRow ? lastRowAdjustedWidth : adjustedWidth;

            return {
                x: col * width,
                y: row * minimizedLayoutsHeight,
                height: minimizedLayoutsHeight,
                width,
                isMinimized: true,
            };
        }
    }

    return (
        <div ref={mainRef} className="flex flex-col h-full w-full max-w-full">
            <div ref={ref} className="relative grow">
                {layoutBoxRef.current && draggedModuleInstanceId !== null && (
                    <LayoutBoxComponents
                        active={draggedModuleInstanceId}
                        layoutBox={layoutBoxRef.current}
                        realSize={layoutDivSize}
                        zIndex={1}
                        pointer={pointer}
                    />
                )}

                {moduleInstances.map((instance) => {
                    const layoutProps = computeModuleLayoutProps(instance);
                    const isDragged = draggedModuleInstanceId === instance.getId();

                    if (!layoutProps) return null;

                    return (
                        <ViewWrapper
                            key={instance.getId()}
                            moduleInstance={instance}
                            workbench={props.workbench}
                            isActive={props.activeModuleInstanceId === instance.getId()}
                            isDragged={isDragged}
                            dragPosition={position}
                            changingLayout={draggedModuleInstanceId !== null}
                            {...layoutProps}
                        />
                    );
                })}
                {makeTempViewWrapperPlaceholder()}
            </div>
        </div>
    );
};

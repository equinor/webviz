import React from "react";

import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { LayoutElement, Workbench } from "@framework/Workbench";
import { useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    MANHATTAN_LENGTH,
    Point,
    Rect,
    Size,
    addMarginToRect,
    pointDifference,
    pointDistance,
    pointMultiplyWithVector,
    pointRelativeToDomRect,
    pointScaleIndividually,
    pointerEventToPoint,
    rectContainsPoint,
} from "@lib/utils/geometry";

import { v4 } from "uuid";

import { ViewWrapper } from "./ViewWrapper";
import { LayoutBox, LayoutBoxComponents, makeLayoutBoxes } from "./layoutBox";
import { ViewWrapperPlaceholder } from "./viewWrapperPlaceholder";

type LayoutProps = {
    workbench: Workbench;
    activeModuleInstanceId: string | null;
};

function convertLayoutRectToRealRect(element: LayoutElement, size: Size): Rect {
    return {
        x: element.relX * size.width,
        y: element.relY * size.height,
        width: element.relWidth * size.width,
        height: element.relHeight * size.height,
    };
}

export const Layout: React.FC<LayoutProps> = (props) => {
    const [draggedModuleInstanceId, setDraggedModuleInstanceId] = React.useState<string | null>(null);
    const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [pointer, setPointer] = React.useState<Point>({ x: -1, y: -1 });
    const [layout, setLayout] = React.useState<LayoutElement[]>([]);
    const [tempLayoutBoxId, setTempLayoutBoxId] = React.useState<string | null>(null);
    const ref = React.useRef<HTMLDivElement>(null);
    const mainRef = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(ref);
    const layoutBoxRef = React.useRef<LayoutBox | null>(null);
    const moduleInstances = useModuleInstances(props.workbench);
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    React.useEffect(() => {
        let pointerDownPoint: Point | null = null;
        let pointerDownElementPosition: Point | null = null;
        let pointerDownElementId: string | null = null;
        let pointerDownElementSize: Size | null = null;
        let relativePointerPosition: Point = { x: 0, y: 0 };
        let relativePointerToElementDiff: Point = { x: 0, y: 0 };
        let dragging = false;
        let moduleInstanceId: string | null = null;
        let moduleName: string | null = null;
        setLayout(props.workbench.getLayout());
        let originalLayout: LayoutElement[] = props.workbench.getLayout();
        let currentLayout: LayoutElement[] = props.workbench.getLayout();
        let originalLayoutBox = makeLayoutBoxes(originalLayout);
        let currentLayoutBox = originalLayoutBox;
        layoutBoxRef.current = currentLayoutBox;
        let lastTimeStamp = 0;
        let lastMovePosition: Point = { x: 0, y: 0 };
        let delayTimer: ReturnType<typeof setTimeout> | null = null;
        let isNewModule = false;

        function adjustLayout() {
            if (currentLayoutBox && moduleInstanceId) {
                const preview = currentLayoutBox.previewLayout(
                    relativePointerPosition,
                    size,
                    moduleInstanceId,
                    isNewModule
                );
                if (preview) {
                    currentLayout = preview.toLayout();
                    currentLayoutBox = preview;
                }
                setLayout(currentLayout);
                layoutBoxRef.current = currentLayoutBox;

                const draggedElementSize = calcSizeOfDraggedElement();

                setPosition(
                    pointDifference(
                        relativePointerPosition,
                        pointMultiplyWithVector(relativePointerToElementDiff, { x: draggedElementSize.width, y: 1 })
                    )
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
                setLayout(currentLayout);
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

        function calcSizeOfDraggedElement(): Size {
            const layoutElement = currentLayout.find((element) => element.moduleInstanceId === pointerDownElementId);
            if (!layoutElement) {
                return { width: 0, height: 0 };
            }
            const rect = convertLayoutRectToRealRect(layoutElement, size);
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
            if (!dragging) {
                if (pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    setDraggedModuleInstanceId(pointerDownElementId);
                    moduleInstanceId = pointerDownElementId;
                    const rect = ref.current.getBoundingClientRect();
                    setPosition(pointRelativeToDomRect(pointerDownElementPosition, rect));
                    relativePointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    dragging = true;
                    relativePointerToElementDiff = pointScaleIndividually(
                        pointDifference(pointerDownPoint, pointerDownElementPosition),
                        pointerDownElementSize.width,
                        1
                    );
                    lastTimeStamp = e.timeStamp;
                    lastMovePosition = pointerEventToPoint(e);
                }
            } else {
                if (!pointerDownElementId || !pointerDownPoint) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                const draggedElementSize = calcSizeOfDraggedElement();
                relativePointerPosition = pointDifference(pointerEventToPoint(e), rect);
                setPosition(
                    pointDifference(
                        relativePointerPosition,
                        pointMultiplyWithVector(relativePointerToElementDiff, { x: draggedElementSize.width, y: 1 })
                    )
                );
                setPointer(pointDifference(pointerEventToPoint(e), rect));
                const speed = pointDistance(pointerEventToPoint(e), lastMovePosition) / (e.timeStamp - lastTimeStamp);
                lastTimeStamp = e.timeStamp;
                lastMovePosition = pointerEventToPoint(e);

                if (!rectContainsPoint(addMarginToRect(rect, 25), pointerEventToPoint(e))) {
                    currentLayout = originalLayout;
                    currentLayoutBox = originalLayoutBox;
                    setLayout(currentLayout);
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
                setLayout(originalLayout);
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
                setLayout(currentLayout);
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
            setLayout(currentLayout);
            originalLayout = currentLayout;
            originalLayoutBox = currentLayoutBox;
            props.workbench.setLayout(currentLayout);
        }

        function addDraggingEventListeners() {
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("keydown", handleButtonClick);
            document.addEventListener("pointercancel", handlePointerUp);
            document.addEventListener("blur", handlePointerUp);
        }

        function removeDraggingEventListeners() {
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("keydown", handleButtonClick);
            document.removeEventListener("pointercancel", handlePointerUp);
            document.removeEventListener("blur", handlePointerUp);
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
            handleModuleHeaderPointerDown
        );
        const removeNewModulePointerDownSubscriber = guiMessageBroker.subscribeToEvent(
            GuiEvent.NewModulePointerDown,
            handleNewModulePointerDown
        );
        const removeRemoveModuleInstanceRequestSubscriber = guiMessageBroker.subscribeToEvent(
            GuiEvent.RemoveModuleInstanceRequest,
            handleRemoveModuleInstanceRequest
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
    }, [size, moduleInstances, guiMessageBroker, props.workbench]);

    function makeTempViewWrapperPlaceholder() {
        if (!tempLayoutBoxId) {
            return null;
        }
        const layoutElement = layout.find((element) => element.moduleInstanceId === tempLayoutBoxId);
        if (!layoutElement) {
            return null;
        }
        const rect = convertLayoutRectToRealRect(layoutElement, size);
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

    return (
        <div ref={mainRef} className="relative flex h-full w-full">
            <div ref={ref} className="h-full flex-grow">
                {layoutBoxRef.current && draggedModuleInstanceId !== null && (
                    <LayoutBoxComponents
                        active={draggedModuleInstanceId}
                        layoutBox={layoutBoxRef.current}
                        realSize={size}
                        zIndex={1}
                        pointer={pointer}
                    />
                )}
                {moduleInstances.map((instance) => {
                    const layoutElement = layout.find((element) => element.moduleInstanceId === instance.getId());
                    if (!layoutElement) {
                        return null;
                    }
                    const rect = convertLayoutRectToRealRect(layoutElement, size);
                    const isDragged = draggedModuleInstanceId === instance.getId();
                    return (
                        <ViewWrapper
                            key={instance.getId()}
                            moduleInstance={instance}
                            workbench={props.workbench}
                            isActive={props.activeModuleInstanceId === instance.getId()}
                            width={rect.width}
                            height={rect.height}
                            x={rect.x}
                            y={rect.y}
                            isDragged={isDragged}
                            dragPosition={position}
                            changingLayout={draggedModuleInstanceId !== null}
                        />
                    );
                })}
                {makeTempViewWrapperPlaceholder()}
            </div>
        </div>
    );
};

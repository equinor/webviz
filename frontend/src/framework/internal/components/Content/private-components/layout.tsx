import React from "react";

import { LayoutElement, Workbench } from "@framework/Workbench";
import { useModuleInstances } from "@framework/internal/hooks/workbenchHooks";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    MANHATTAN_LENGTH,
    Point,
    Rect,
    addMarginToRect,
    pointDifference,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    rectContainsPoint,
} from "@lib/utils/geometry";

import { v4 } from "uuid";

import { ViewWrapper } from "./ViewWrapper";
import { LayoutBox, LayoutBoxComponents, makeLayoutBoxes } from "./layoutBox";
import { ModulesList } from "./modulesList";
import { GroupModules } from "./syncSettings";
import { TemplatesList } from "./templatesList";
import { ViewWrapperPlaceholder } from "./viewWrapperPlaceholder";

type LayoutProps = {
    workbench: Workbench;
    activeModuleId: string | null;
};

export enum LayoutEventTypes {
    MODULE_INSTANCE_POINTER_DOWN = "MODULE_INSTANCE_POINTER_DOWN",
    NEW_MODULE_POINTER_DOWN = "NEW_MODULE_POINTER_DOWN",
    REMOVE_MODULE_INSTANCE_REQUEST = "REMOVE_MODULE_INSTANCE_REQUEST",
}

export interface LayoutEvents {
    [LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]: CustomEvent<{
        id: string;
        elementPosition: Point;
        pointerPoint: Point;
    }>;
    [LayoutEventTypes.NEW_MODULE_POINTER_DOWN]: CustomEvent<{
        name: string;
        elementPosition: Point;
        pointerPoint: Point;
    }>;
    [LayoutEventTypes.REMOVE_MODULE_INSTANCE_REQUEST]: CustomEvent<{
        id: string;
    }>;
}

declare global {
    interface Document {
        addEventListener<K extends keyof LayoutEvents>(
            type: K,
            listener: (ev: LayoutEvents[K]) => any,
            options?: boolean | AddEventListenerOptions
        ): void;
        removeEventListener<K extends keyof LayoutEvents>(
            type: K,
            listener: (ev: LayoutEvents[K]) => any,
            options?: boolean | EventListenerOptions
        ): void;
        dispatchEvent<K extends keyof LayoutEvents>(event: LayoutEvents[K]): void;
    }
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

    const convertLayoutRectToRealRect = React.useCallback(
        (element: LayoutElement): Rect => {
            return {
                x: element.relX * size.width,
                y: element.relY * size.height,
                width: element.relWidth * size.width,
                height: element.relHeight * size.height,
            };
        },
        [size]
    );

    React.useEffect(() => {
        let pointerDownPoint: Point | null = null;
        let pointerDownElementPosition: Point | null = null;
        let pointerDownElementId: string | null = null;
        let relativePointerPosition: Point = { x: 0, y: 0 };
        let pointerToElementDiff: Point = { x: 0, y: 0 };
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

        const adjustLayout = () => {
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
            }
            delayTimer = null;
        };

        const handleModuleInstancePointerDown = (e: LayoutEvents[LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]) => {
            pointerDownPoint = e.detail.pointerPoint;
            pointerDownElementPosition = e.detail.elementPosition;
            pointerDownElementId = e.detail.id;
            isNewModule = false;
        };

        const handleNewModulePointerDown = (e: LayoutEvents[LayoutEventTypes.NEW_MODULE_POINTER_DOWN]) => {
            pointerDownPoint = e.detail.pointerPoint;
            pointerDownElementPosition = e.detail.elementPosition;
            pointerDownElementId = v4();
            setTempLayoutBoxId(pointerDownElementId);
            isNewModule = true;
            moduleName = e.detail.name;
        };

        const handlePointerUp = () => {
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
            }
            pointerDownPoint = null;
            pointerDownElementPosition = null;
            pointerDownElementId = null;
            moduleInstanceId = null;
            dragging = false;
            document.body.classList.remove("select-none");
            originalLayout = currentLayout;
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownPoint || !ref.current || !pointerDownElementId || !pointerDownElementPosition) {
                return;
            }
            if (!dragging) {
                if (pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    setDraggedModuleInstanceId(pointerDownElementId);
                    moduleInstanceId = pointerDownElementId;
                    const rect = ref.current.getBoundingClientRect();
                    setPosition(pointRelativeToDomRect(pointerDownElementPosition, rect));
                    relativePointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    document.body.classList.add("select-none");
                    dragging = true;
                    pointerToElementDiff = pointDifference(pointerDownPoint, pointerDownElementPosition);
                    lastTimeStamp = e.timeStamp;
                    lastMovePosition = pointerEventToPoint(e);
                }
            } else {
                if (!pointerDownElementId || !pointerDownPoint) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                setPosition(pointDifference(pointDifference(pointerEventToPoint(e), rect), pointerToElementDiff));
                setPointer(pointDifference(pointerEventToPoint(e), rect));
                relativePointerPosition = pointDifference(pointerEventToPoint(e), rect);
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
        };

        const handleButtonClick = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (delayTimer) {
                    clearTimeout(delayTimer);
                }
                setLayout(originalLayout);
                currentLayout = originalLayout;
                pointerDownPoint = null;
                pointerDownElementPosition = null;
                pointerDownElementId = null;
                setDraggedModuleInstanceId(null);
                moduleInstanceId = null;
                dragging = false;
                document.body.classList.remove("select-none");
                originalLayout = currentLayout;
                currentLayoutBox = makeLayoutBoxes(currentLayout);
                originalLayoutBox = currentLayoutBox;
                setLayout(currentLayout);
                isNewModule = false;
                setTempLayoutBoxId(null);
            }
        };

        const handleRemoveModuleInstanceRequest = (
            e: LayoutEvents[LayoutEventTypes.REMOVE_MODULE_INSTANCE_REQUEST]
        ) => {
            if (delayTimer) {
                clearTimeout(delayTimer);
            }
            if (dragging) {
                return;
            }
            props.workbench.removeModuleInstance(e.detail.id);
            currentLayoutBox.removeLayoutElement(e.detail.id);
            currentLayout = currentLayoutBox.toLayout();
            setLayout(currentLayout);
            originalLayout = currentLayout;
            originalLayoutBox = currentLayoutBox;
            props.workbench.setLayout(currentLayout);
        };

        document.addEventListener(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, handleModuleInstancePointerDown);
        document.addEventListener(LayoutEventTypes.NEW_MODULE_POINTER_DOWN, handleNewModulePointerDown);
        document.addEventListener(LayoutEventTypes.REMOVE_MODULE_INSTANCE_REQUEST, handleRemoveModuleInstanceRequest);
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("keydown", handleButtonClick);

        return () => {
            document.removeEventListener(
                LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN,
                handleModuleInstancePointerDown
            );
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("keydown", handleButtonClick);
            if (delayTimer) {
                clearTimeout(delayTimer);
            }
        };
    }, [size, moduleInstances]);

    const makeTempViewWrapperPlaceholder = () => {
        if (!tempLayoutBoxId) {
            return null;
        }
        const layoutElement = layout.find((element) => element.moduleInstanceId === tempLayoutBoxId);
        if (!layoutElement) {
            return null;
        }
        const rect = convertLayoutRectToRealRect(layoutElement);
        return (
            <ViewWrapperPlaceholder
                key={tempLayoutBoxId}
                width={rect.width}
                height={rect.height}
                x={rect.x}
                y={rect.y}
            />
        );
    };

    return (
        <div ref={mainRef} className="relative flex h-full w-full">
            <div ref={ref} className="h-full flex-grow">
                {layoutBoxRef.current && (
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
                    const rect = convertLayoutRectToRealRect(layoutElement);
                    const isDragged = draggedModuleInstanceId === instance.getId();
                    return (
                        <ViewWrapper
                            key={instance.getId()}
                            moduleInstance={instance}
                            workbench={props.workbench}
                            isActive={props.activeModuleId === instance.getId()}
                            width={rect.width}
                            height={rect.height}
                            x={rect.x}
                            y={rect.y}
                            isDragged={isDragged}
                            dragPosition={position}
                        />
                    );
                })}
                {makeTempViewWrapperPlaceholder()}
            </div>
            <ModulesList relContainer={mainRef.current} workbench={props.workbench} />
            <TemplatesList relContainer={mainRef.current} workbench={props.workbench} />
            <GroupModules relContainer={mainRef.current} workbench={props.workbench} />
        </div>
    );
};
